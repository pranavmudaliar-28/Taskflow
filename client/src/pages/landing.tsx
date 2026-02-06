import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  CheckCircle2, 
  Clock, 
  Users, 
  BarChart3, 
  Zap, 
  Shield,
  ArrowRight,
  Kanban
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <Kanban className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold">TaskFlow Pro</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing">
                Pricing
              </a>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" data-testid="button-signin">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button data-testid="button-login">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Zap className="h-4 w-4" />
                  Built for remote teams
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                  Project management that{" "}
                  <span className="text-primary">actually works</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg">
                  Real-time task tracking, time management, and team collaboration 
                  in one powerful platform. Ship faster, together.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" data-testid="button-get-started">
                    Start for Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
                  <a href="#features">Learn More</a>
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Free forever plan
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  No credit card required
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-border">
                <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 p-6">
                  <div className="h-full bg-card rounded-lg shadow-lg p-4 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b">
                      <span className="font-medium">Project Board</span>
                      <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-400" />
                        <div className="h-3 w-3 rounded-full bg-amber-400" />
                        <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {["To Do", "In Progress", "Done"].map((col, i) => (
                        <div key={col} className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {col}
                          </div>
                          {[...Array(3 - i)].map((_, j) => (
                            <div 
                              key={j} 
                              className="h-16 rounded-md bg-muted/50 border border-border/50 p-2"
                            >
                              <div className="h-2 w-3/4 bg-foreground/10 rounded" />
                              <div className="h-2 w-1/2 bg-foreground/5 rounded mt-2" />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 inset-0 bg-gradient-to-r from-primary/30 to-secondary/30 blur-3xl opacity-30" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything your team needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From task management to time tracking, TaskFlow Pro gives you the tools 
              to ship faster and stay organized.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Kanban,
                title: "Kanban Boards",
                description: "Visualize your workflow with drag-and-drop task boards. See progress at a glance."
              },
              {
                icon: Clock,
                title: "Time Tracking",
                description: "Track time spent on tasks with precision. Start, stop, and log hours effortlessly."
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Assign tasks, add reviewers, and work together seamlessly in real-time."
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description: "Get insights into productivity, task completion rates, and team performance."
              },
              {
                icon: Shield,
                title: "Role-Based Access",
                description: "Control who can do what with granular permissions for admins, leads, and members."
              },
              {
                icon: Zap,
                title: "Real-Time Updates",
                description: "See changes instantly. No refresh needed. Stay in sync with your team."
              },
            ].map((feature, index) => (
              <Card key={index} className="hover-elevate transition-all duration-200">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you need more.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                description: "For individuals and small projects",
                features: ["Up to 3 projects", "Basic task management", "Time tracking", "Email support"],
                cta: "Get Started",
                popular: false
              },
              {
                name: "Pro",
                price: "$29",
                description: "For growing teams",
                features: ["Unlimited projects", "Advanced analytics", "Priority support", "Custom fields"],
                cta: "Start Free Trial",
                popular: true
              },
              {
                name: "Team",
                price: "$99",
                description: "For large organizations",
                features: ["Everything in Pro", "Advanced reporting", "Dedicated support", "SSO & compliance"],
                cta: "Contact Sales",
                popular: false
              }
            ].map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'ring-2 ring-primary shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-6 pt-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                    <div className="text-4xl font-bold mb-2">
                      {plan.price}
                      <span className="text-base font-normal text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup">
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "default" : "outline"}
                      data-testid={`button-plan-${plan.name.toLowerCase()}`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <Kanban className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">TaskFlow Pro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 TaskFlow Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
