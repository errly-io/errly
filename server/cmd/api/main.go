package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"server/internal/config"
	"server/internal/database"
	"server/internal/handlers"
	"server/internal/middleware"
	"server/internal/models"
	"server/internal/repository"
	"server/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize databases
	postgresDB, err := database.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer postgresDB.Close()

	clickhouseDB, err := database.NewClickHouseDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to ClickHouse: %v", err)
	}
	defer clickhouseDB.Close()

	redisDB, err := database.NewRedisDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisDB.Close()

	// Initialize repositories
	apiKeysRepo := repository.NewAPIKeysRepository(postgresDB)
	projectsRepo := repository.NewProjectsRepository(postgresDB)
	eventsRepo := repository.NewEventsRepository(clickhouseDB)
	issuesRepo := repository.NewIssuesRepository(clickhouseDB)

	// Initialize services
	ingestService := services.NewIngestService(eventsRepo, issuesRepo)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(apiKeysRepo, projectsRepo)
	rateLimitMiddleware := middleware.NewRateLimitMiddleware(redisDB, &cfg.RateLimit)

	// Initialize handlers
	ingestHandler := handlers.NewIngestHandler(ingestService)
	issuesHandler := handlers.NewIssuesHandler(issuesRepo, eventsRepo)
	projectsHandler := handlers.NewProjectsHandler(projectsRepo, eventsRepo, issuesRepo)

	// Setup Gin
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Global middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// CORS configuration
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000", "https://errly.dev"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"}
	corsConfig.ExposeHeaders = []string{"X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"}
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	// Health check endpoint (no auth required)
	router.GET("/health", func(c *gin.Context) {
		// Check database health
		if err := postgresDB.Health(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "unhealthy",
				"error":  "PostgreSQL connection failed",
			})
			return
		}

		if err := clickhouseDB.Health(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "unhealthy",
				"error":  "ClickHouse connection failed",
			})
			return
		}

		if err := redisDB.Health(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "unhealthy",
				"error":  "Redis connection failed",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Unix(),
			"version":   "1.0.0",
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")

	// Authentication validation endpoint
	authGroup := v1.Group("/auth")
	authGroup.Use(rateLimitMiddleware.RateLimit())
	authGroup.Use(authMiddleware.RequireAPIKey())
	{
		authGroup.POST("/validate", projectsHandler.ValidateAPIKey)
	}

	// Ingestion endpoints (require ingest scope)
	ingestGroup := v1.Group("/ingest")
	ingestGroup.Use(rateLimitMiddleware.IngestRateLimit())
	ingestGroup.Use(authMiddleware.RequireAPIKey(models.ScopeIngest))
	{
		ingestGroup.POST("", ingestHandler.IngestEvents)
		ingestGroup.GET("/info", ingestHandler.GetIngestInfo)
		ingestGroup.GET("/health", ingestHandler.HealthCheck)
	}

	// Issues endpoints (require read scope)
	issuesGroup := v1.Group("/issues")
	issuesGroup.Use(rateLimitMiddleware.RateLimit())
	issuesGroup.Use(authMiddleware.RequireAPIKey(models.ScopeRead))
	{
		issuesGroup.GET("", issuesHandler.GetIssues)
		issuesGroup.GET("/:id", issuesHandler.GetIssue)
		issuesGroup.GET("/:id/events", issuesHandler.GetIssueEvents)
		issuesGroup.GET("/:id/timeseries", issuesHandler.GetIssueTimeSeries)

		// Status updates require admin scope
		issuesGroup.PATCH("/:id/status", authMiddleware.RequireScope(models.ScopeAdmin), issuesHandler.UpdateIssueStatus)
	}

	// Projects endpoints (require read scope)
	projectsGroup := v1.Group("/projects")
	projectsGroup.Use(rateLimitMiddleware.RateLimit())
	projectsGroup.Use(authMiddleware.RequireAPIKey(models.ScopeRead))
	{
		projectsGroup.GET("/:id", projectsHandler.GetProject)
		projectsGroup.GET("/:id/stats", projectsHandler.GetProjectStats)
		projectsGroup.GET("/:id/issues", projectsHandler.GetProjectIssues)
		projectsGroup.GET("/:id/events", projectsHandler.GetProjectEvents)
	}

	// Rate limit info endpoint (for debugging)
	if cfg.IsDevelopment() {
		debugGroup := v1.Group("/debug")
		debugGroup.Use(authMiddleware.RequireAPIKey())
		{
			debugGroup.GET("/ratelimit", rateLimitMiddleware.GetRateLimitInfo)
		}
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on %s:%s", cfg.Server.Host, cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
