import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/ui/navbar";
import { Users, Clock, Video, CheckCircle, FileText, Shield, Building, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: Users,
      title: "Browse Verified Mentors",
      description: "Explore our curated list of industry professionals. All mentors are verified through our rigorous process including LinkedIn verification, resume review, and company confirmation.",
      color: "bg-blue-50 text-trust-badge"
    },
    {
      icon: Clock,
      title: "Book a Session", 
      description: "Choose from available time slots and schedule a 45-minute video call at a time that works for both you and your mentor. Our booking system ensures seamless scheduling.",
      color: "bg-green-50 text-verified-green"
    },
    {
      icon: Video,
      title: "Get Expert Guidance",
      description: "Connect via video call to receive personalized career advice, resume feedback, interview preparation, and industry insights from experienced professionals.",
      color: "bg-yellow-50 text-yellow-600"
    }
  ];

  const verificationProcess = [
    {
      icon: CheckCircle,
      title: "Email Verification",
      description: "Professional email confirmation and identity validation"
    },
    {
      icon: FileText,
      title: "LinkedIn Verification", 
      description: "Profile authenticity and company validation"
    },
    {
      icon: Shield,
      title: "Resume Review",
      description: "Experience verification and skills assessment"
    },
    {
      icon: Building,
      title: "Company Confirmation",
      description: "Current employment and role verification"
    }
  ];

  const benefits = [
    "1-on-1 personalized guidance",
    "Industry-specific expertise",
    "Flexible scheduling",
    "Verified professional mentors",
    "Career advancement strategies",
    "Resume and portfolio reviews",
    "Interview preparation",
    "Networking opportunities"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="px-6 py-16 text-center bg-gradient-to-b from-blue-50 to-background">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-foreground">
            How <span className="text-trust-badge">ApplyWizz</span> Works
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with verified industry experts in three simple steps. Get personalized career guidance from professionals at top companies.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/mentors')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
          >
            Get Started Now →
          </Button>
        </div>
      </section>

      {/* Main Steps */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Three Simple Steps</h2>
            <p className="text-xl text-muted-foreground">From discovery to mentorship in minutes</p>
          </div>
          
          <div className="space-y-12">
            {steps.map((step, index) => (
              <div key={index} className="grid md:grid-cols-2 gap-12 items-center">
                <div className={index % 2 === 1 ? "md:order-2" : ""}>
                  <Card className="p-8 border-0 shadow-card">
                    <CardContent className="p-0">
                      <div className={`w-16 h-16 rounded-full ${step.color} flex items-center justify-center mb-6`}>
                        <step.icon className="w-8 h-8" />
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-3xl font-bold text-trust-badge">{index + 1}</span>
                        <h3 className="text-2xl font-semibold text-foreground">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground text-lg leading-relaxed">{step.description}</p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className={index % 2 === 1 ? "md:order-1" : ""}>
                  <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center">
                    <step.icon className="w-24 h-24 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Process */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Trust & Safety First</h2>
            <p className="text-xl text-muted-foreground">Every mentor goes through our rigorous verification process</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {verificationProcess.map((step, index) => (
              <Card key={index} className="text-center p-6 border-0 shadow-card">
                <CardContent className="p-0">
                  <div className="w-16 h-16 rounded-full bg-verified-green/20 text-verified-green flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 text-foreground">What You Get</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Comprehensive mentorship designed to accelerate your career growth
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-verified-green flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Card className="p-8 border-0 shadow-card">
              <CardContent className="p-0 text-center">
                <div className="w-16 h-16 rounded-full bg-trust-badge/20 text-trust-badge flex items-center justify-center mx-auto mb-6">
                  <Video className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-foreground">45-Minute Sessions</h3>
                <p className="text-muted-foreground mb-6">
                  Dedicated time for deep-dive discussions about your career goals, challenges, and next steps.
                </p>
                <Button 
                  onClick={() => navigate('/mentors')}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Find Your Mentor
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 bg-gradient-to-r from-trust-badge to-verified-green text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of professionals who've advanced their careers with ApplyWizz
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => navigate('/mentors')}
              className="bg-white text-trust-badge hover:bg-gray-100 px-8 py-3 text-lg"
            >
              Find Mentors →
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/become-mentor')}
              className="border-white text-white hover:bg-white/10 px-8 py-3 text-lg"
            >
              Become a Mentor
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;