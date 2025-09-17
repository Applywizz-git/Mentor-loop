import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/ui/navbar";
import { ContactModal } from "@/components/ui/contact-modal";
import { Users, Clock, Video, CheckCircle, FileText, Shield, Building } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect,useState } from "react";
import {supabase} from "@/lib/supabase";
import { seedDemoData } from "@/lib/data";
import logo from "@/assets/applywizz-logo.png";


const Landing = () => {
  const [data, setData]= useState("");
  const navigate = useNavigate();

  useEffect(() => {
    seedDemoData();
  }, []);

  // useEffect(() => {
  //   const checkSupabaseConnection = async () => {
  //     try {
  //       const { data, error } = await supabase.from('profiles').select('*');
  //       if (error) {
  //         console.error("Supabase connection error:", error);
  //       } else {
  //         console.log("Supabase connection successful:", data);
  //         setData(JSON.stringify(data));
  //       }
  //     } catch (err) {
  //       console.error("Unexpected error while connecting to Supabase:", err);
  //     }
  //   };
    
  //   checkSupabaseConnection();
  // }, []);

  const trustStats = [
    { icon: CheckCircle, label: "100% Verified Mentors", color: "text-verified-green" },
    { icon: Users, label: "2,000+ Sessions Completed", color: "text-trust-badge" },
    { icon: CheckCircle, label: "4.9/5 Average Rating", color: "text-yellow-500" }
  ];

  const howItWorksSteps = [
    {
      icon: Users,
      title: "Browse Verified Mentors",
      description: "Explore our curated list of industry professionals, all verified with LinkedIn, resume, and company confirmation.",
      color: "bg-blue-50 text-trust-badge"
    },
    {
      icon: Clock,
      title: "Book a Session",
      description: "Schedule a 45-minute video call at a time that works for both you and your mentor.",
      color: "bg-green-50 text-verified-green"
    },
    {
      icon: Video,
      title: "Get Expert Guidance",
      description: "Receive personalized career advice, resume feedback, and industry insights from experienced professionals.",
      color: "bg-yellow-50 text-yellow-600"
    }
  ];

  const verificationSteps = [
    {
      icon: CheckCircle,
      title: "Email Verification",
      description: "Professional email confirmation"
    },
    {
      icon: FileText,
      title: "LinkedIn Verification", 
      description: "Profile and company validation"
    },
    {
      icon: Shield,
      title: "Resume Review",
      description: "Experience and skills verification"
    },
    {
      icon: Building,
      title: "Company Confirmation",
      description: "Current employment verification"
    }
  ];

  const featuredMentors = [
    {
      name: "Sarah Chen",
      title: "Senior Product Manager",
      company: "Meta",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b5c8?w=400&h=400&fit=crop&crop=face",
      rating: 4.9,
      reviews: 47,
      specialties: ["Product Strategy", "Career Growth", "Leadership"]
    },
    {
      name: "David Rodriguez", 
      title: "Lead Software Engineer",
      company: "Google",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
      rating: 5.0,
      reviews: 32,
      specialties: ["System Design", "Technical Interviews", "ML"]
    },
    {
      name: "Emily Watson",
      title: "VP of Marketing", 
      company: "Stripe",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face",
      rating: 4.8,
      reviews: 63,
      specialties: ["Growth Marketing", "Brand Strategy", "Team Management"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-6 bg-blue-50 text-trust-badge border-blue-200">
            ⭐ Trusted by 500+ professionals
          </Badge>
          
          <h1 className="text-5xl font-bold mb-6 text-foreground">
            Find a <span className="text-trust-badge">Mentor</span>,<br />
            <span className="text-verified-green">Verified</span> by ApplyWizz
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with industry experts who've been thoroughly verified. Get personalized career guidance from professionals at top companies.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/mentors')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
            >
              Find Your Mentor →
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/become-mentor')}
              className="px-8 py-3 text-lg"
            >
              Become a Mentor
            </Button>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            {trustStats.map((stat, index) => (
              <div key={index} className="flex items-center gap-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="px-6 py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-foreground">How ApplyWizz Works</h2>
            <p className="text-xl text-muted-foreground">Simple, secure, and effective mentorship in three easy steps</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorksSteps.map((step, index) => (
              <Card key={index} className="text-center p-8 border-0 shadow-card">
                <CardContent className="p-0">
                  <div className={`w-16 h-16 rounded-full ${step.color} flex items-center justify-center mx-auto mb-6`}>
                    <step.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Mentors */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Meet Our Verified Mentors</h2>
            <p className="text-xl text-muted-foreground">Industry leaders ready to help you advance your career</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {featuredMentors.map((mentor, index) => (
              <Card key={index} className="p-6 shadow-card border border-border rounded-2xl">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <img
                        src={mentor.avatar}
                        alt={mentor.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-verified-green text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        ✓ Verified
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{mentor.name}</h3>
                      <p className="text-sm text-muted-foreground">{mentor.title}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building className="w-3 h-3" />
                        <span>{mentor.company}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mentor.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-medium">{mentor.rating}</span>
                      <span className="text-muted-foreground">({mentor.reviews})</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/mentors')}
                    >
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <Button 
              size="lg"
              onClick={() => navigate('/mentors')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              View All Mentors →
            </Button>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="px-6 py-16 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Trust & Safety First</h2>
            <p className="text-xl text-gray-300">Every mentor goes through our rigorous verification process</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {verificationSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-verified-green/20 text-verified-green flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 bg-gradient-to-r from-trust-badge to-verified-green text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Accelerate Your Career?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of professionals who've advanced their careers with ApplyWizz mentors
          </p>
          <Button 
            size="lg"
            variant="secondary"
            onClick={() => navigate('/mentors')}
            className="bg-white text-trust-badge hover:bg-gray-100 px-8 py-3 text-lg"
          >
            Get Started Today →
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="become-mentor" className="px-6 py-12 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="ApplyWizz" className="h-8 w-auto" />
                <span className="font-bold">APPLY WIZZ</span>
              </div>
              <p className="text-gray-400">
                Connecting ambitious professionals with verified industry mentors.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/mentors" className="hover:text-white">Find Mentors</a></li>
                <li><a href="/become-mentor" className="hover:text-white">Become a Mentor</a></li>
                <li><a href="/how-it-works" className="hover:text-white">How it Works</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <ContactModal>
                    <button className="hover:text-white">Contact Us</button>
                  </ContactModal>
                </li>
                <li><a href="#" className="hover:text-white">Safety</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/privacy-policy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms-of-service" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2024 ApplyWizz. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;