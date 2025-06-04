#!/bin/bash

# Comprehensive security audit script for Errly
# This script runs multiple security checks and generates a report

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_status() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}🔒 $1${NC}"
    echo "=================================================="
}

# Create reports directory
REPORTS_DIR="reports/security"
mkdir -p "$REPORTS_DIR"

# Generate timestamp for reports
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORTS_DIR/security_audit_$TIMESTAMP.md"

# Initialize report
cat > "$REPORT_FILE" << EOF
# Security Audit Report

**Date:** $(date)
**Project:** Errly Error Tracking System
**Audit Type:** Comprehensive Security Analysis

## Executive Summary

This report contains the results of automated security analysis tools run against the Errly codebase.

---

EOF

print_header "SECURITY AUDIT STARTING"

# 1. Dependency Vulnerability Scan
print_status "Running dependency vulnerability scan..."
echo "## 1. Dependency Vulnerabilities" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if command -v pnpm &> /dev/null; then
    echo "### npm audit results:" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    if pnpm audit --audit-level moderate >> "$REPORT_FILE" 2>&1; then
        print_success "No high-severity vulnerabilities found in dependencies"
        echo "✅ No high-severity vulnerabilities found" >> "$REPORT_FILE"
    else
        print_warning "Vulnerabilities found in dependencies - check report"
    fi
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    print_warning "pnpm not found, skipping dependency scan"
fi

# 2. ESLint Security Rules
print_status "Running ESLint security analysis..."
echo "## 2. Static Code Analysis (ESLint Security)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ -f "web/.eslintrc.json" ]; then
    echo "### ESLint security issues:" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    if npx eslint web/src --ext .ts,.tsx --config tools/quality/eslint-security.config.mjs >> "$REPORT_FILE" 2>&1; then
        print_success "No ESLint security issues found"
        echo "✅ No security issues found by ESLint" >> "$REPORT_FILE"
    else
        print_warning "ESLint security issues found - check report"
    fi
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    print_warning "ESLint config not found, skipping static analysis"
fi

# 3. Go Security Analysis
print_status "Running Go security analysis..."
echo "## 3. Go Security Analysis (gosec)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if command -v gosec &> /dev/null; then
    echo "### gosec security scan:" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    if gosec -fmt json -out "$REPORTS_DIR/gosec_$TIMESTAMP.json" ./... 2>/dev/null; then
        # Convert JSON to readable format for report
        if command -v jq &> /dev/null; then
            jq -r '.Issues[] | "File: \(.file):\(.line) - \(.details) (Severity: \(.severity))"' "$REPORTS_DIR/gosec_$TIMESTAMP.json" >> "$REPORT_FILE" 2>/dev/null || echo "✅ No Go security issues found" >> "$REPORT_FILE"
        else
            echo "✅ gosec scan completed - see JSON report for details" >> "$REPORT_FILE"
        fi
        print_success "Go security scan completed"
    else
        print_warning "gosec scan found issues - check report"
    fi
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    print_warning "gosec not installed, skipping Go security analysis"
    echo "⚠️ gosec not installed - install with: go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# 4. Secrets Detection
print_status "Scanning for secrets and credentials..."
echo "## 4. Secrets Detection" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Simple regex-based secret detection
echo "### Potential secrets found:" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]*['\"]"
    "api[_-]?key\s*=\s*['\"][^'\"]*['\"]"
    "secret\s*=\s*['\"][^'\"]*['\"]"
    "token\s*=\s*['\"][^'\"]*['\"]"
    "private[_-]?key"
    "-----BEGIN.*PRIVATE KEY-----"
    "sk_live_[0-9a-zA-Z]{24,}"
    "pk_live_[0-9a-zA-Z]{24,}"
)

SECRETS_FOUND=false
for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r -i -E "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.go" --include="*.sql" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build . 2>/dev/null; then
        SECRETS_FOUND=true
    fi
done

if [ "$SECRETS_FOUND" = false ]; then
    echo "✅ No obvious secrets detected in code" >> "$REPORT_FILE"
    print_success "No secrets detected in code"
else
    print_warning "Potential secrets found - review manually"
fi

echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 5. File Permissions Check
print_status "Checking file permissions..."
echo "## 5. File Permissions" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Files with potentially unsafe permissions:" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

# Check for world-writable files
if find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | head -10; then
    print_warning "World-writable files found"
else
    echo "✅ No world-writable files found" >> "$REPORT_FILE"
    print_success "File permissions look good"
fi

echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 6. Environment Variables Check
print_status "Checking environment configuration..."
echo "## 6. Environment Configuration" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Environment files security:" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

ENV_FILES=(".env" ".env.local" ".env.development" ".env.production")
for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        echo "Found: $env_file" >> "$REPORT_FILE"
        # Check if it's in .gitignore
        if grep -q "$env_file" .gitignore 2>/dev/null; then
            echo "  ✅ Listed in .gitignore" >> "$REPORT_FILE"
        else
            echo "  ⚠️  NOT in .gitignore - potential security risk!" >> "$REPORT_FILE"
            print_warning "$env_file not in .gitignore"
        fi
    fi
done

echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 7. Database Security Check
print_status "Checking database security configuration..."
echo "## 7. Database Security" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "### Database configuration review:" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

# Check for hardcoded database credentials
if grep -r -i "password.*=" --include="*.sql" --include="*.go" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | grep -v "placeholder\|example\|test"; then
    print_warning "Potential hardcoded database credentials found"
    echo "⚠️ Potential hardcoded credentials found - review manually" >> "$REPORT_FILE"
else
    echo "✅ No hardcoded database credentials detected" >> "$REPORT_FILE"
    print_success "Database configuration looks secure"
fi

echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 8. Generate Summary
echo "## Summary and Recommendations" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "### Immediate Actions Required:" >> "$REPORT_FILE"
echo "- [ ] Review any vulnerabilities found in dependencies" >> "$REPORT_FILE"
echo "- [ ] Address any ESLint security warnings" >> "$REPORT_FILE"
echo "- [ ] Verify that all environment files are in .gitignore" >> "$REPORT_FILE"
echo "- [ ] Review any potential secrets detected" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "### Recommended Security Practices:" >> "$REPORT_FILE"
echo "- [ ] Enable dependabot for automated dependency updates" >> "$REPORT_FILE"
echo "- [ ] Set up SAST (Static Application Security Testing) in CI/CD" >> "$REPORT_FILE"
echo "- [ ] Implement security headers in production" >> "$REPORT_FILE"
echo "- [ ] Regular security audits and penetration testing" >> "$REPORT_FILE"
echo "- [ ] Monitor for security advisories in used technologies" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "### Tools Used:" >> "$REPORT_FILE"
echo "- npm audit (dependency vulnerabilities)" >> "$REPORT_FILE"
echo "- ESLint with security plugins (static analysis)" >> "$REPORT_FILE"
echo "- gosec (Go security analysis)" >> "$REPORT_FILE"
echo "- Custom regex patterns (secrets detection)" >> "$REPORT_FILE"
echo "- File system checks (permissions and configuration)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

print_header "SECURITY AUDIT COMPLETED"
print_success "Security audit report generated: $REPORT_FILE"
print_info "Review the report and address any findings"

# Open report if possible
if command -v code &> /dev/null; then
    print_info "Opening report in VS Code..."
    code "$REPORT_FILE"
elif command -v open &> /dev/null; then
    print_info "Opening report..."
    open "$REPORT_FILE"
fi
