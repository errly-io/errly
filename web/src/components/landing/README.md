# Landing Page Components

Components for Errly landing page.

## Structure

### LandingLayout
Main layout for landing page with header, footer and mobile menu.

**Features:**
- Responsive header with navigation
- Mobile menu via Drawer
- Footer with links
- Separate layout from main application

### StatsSection
Section with company statistics.

**Shows:**
- Number of developers
- Number of tracked errors
- Uptime guarantees
- Security monitoring

### TestimonialsSection
Section with customer testimonials.

**Includes:**
- Testimonial cards
- Ratings
- Customer information
- Photos (via Unsplash)

### CTASection
Call-to-Action section.

**Contains:**
- Gradient background
- Call to registration
- Action buttons
- Trial period information

## Usage

```tsx
import { LandingLayout } from '@/components/landing/LandingLayout';
import { StatsSection } from '@/components/landing/StatsSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CTASection } from '@/components/landing/CTASection';

export default function LandingPage() {
  return (
    <LandingLayout>
      <Box>
        {/* Hero Section */}
        <Container>...</Container>
        
        <StatsSection />
        
        {/* Features Section */}
        <Container>...</Container>
        
        {/* Pricing Section */}
        <Container>...</Container>
        
        <TestimonialsSection />
        
        <CTASection />
      </Box>
    </LandingLayout>
  );
}
```

## Navigation

Landing page includes navigation via anchor links:
- `#features` - features section
- `#pricing` - pricing section

## Responsive Design

All components are adapted for mobile devices:
- Mobile menu via Burger + Drawer
- Responsive grid for cards
- Hiding elements on mobile devices
- Adaptive text sizes and spacing

## Styling

Uses Mantine UI with custom styles:
- Gradients for headings and CTA
- Brand color scheme (blue)
- Shadows and hover animations
- Consistent spacing and sizes
