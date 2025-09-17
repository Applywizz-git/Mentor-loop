import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent } from "@/components/ui/card";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Terms of Service</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Last updated: January 1, 2024
          </p>

          <div className="space-y-8">
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground mb-4">
                  By accessing and using ApplyWizz, you accept and agree to be bound by the terms and provision of this agreement. 
                  If you do not agree to abide by the above, please do not use this service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Platform Services</h2>
                <p className="text-muted-foreground mb-4">
                  ApplyWizz provides a platform that connects mentees with verified industry mentors. Our services include:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Mentor verification and background checks</li>
                  <li>Booking and scheduling system</li>
                  <li>Video call facilitation</li>
                  <li>Payment processing</li>
                  <li>Dispute resolution support</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">3. User Responsibilities</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-foreground">For Mentees:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Provide accurate information during registration</li>
                      <li>Attend scheduled sessions on time</li>
                      <li>Treat mentors with respect and professionalism</li>
                      <li>Pay for services as agreed</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-foreground">For Mentors:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Maintain accurate professional credentials</li>
                      <li>Provide quality mentorship services</li>
                      <li>Honor scheduled appointments</li>
                      <li>Maintain confidentiality of mentee information</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Payment and Refunds</h2>
                <p className="text-muted-foreground mb-4">
                  Payment is required at the time of booking. Refunds are available under the following conditions:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Mentor cancellation: Full refund</li>
                  <li>Mentee cancellation 24+ hours before: Full refund</li>
                  <li>Mentee cancellation less than 24 hours: No refund</li>
                  <li>Technical issues preventing session: Full refund</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Privacy and Data Protection</h2>
                <p className="text-muted-foreground mb-4">
                  We take your privacy seriously. All personal information is collected and used in accordance with our Privacy Policy. 
                  We implement appropriate security measures to protect your data.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Prohibited Conduct</h2>
                <p className="text-muted-foreground mb-4">
                  Users are prohibited from:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Sharing contact information to circumvent platform fees</li>
                  <li>Harassing or discriminating against other users</li>
                  <li>Providing false or misleading information</li>
                  <li>Using the platform for any illegal activities</li>
                  <li>Recording sessions without explicit consent</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Limitation of Liability</h2>
                <p className="text-muted-foreground mb-4">
                  ApplyWizz serves as a platform connecting mentors and mentees. We do not guarantee specific outcomes 
                  from mentoring sessions. Our liability is limited to the amount paid for services.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Termination</h2>
                <p className="text-muted-foreground mb-4">
                  We reserve the right to terminate or suspend accounts that violate these terms. 
                  Users may terminate their accounts at any time by contacting support.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Changes to Terms</h2>
                <p className="text-muted-foreground mb-4">
                  We may update these terms periodically. Continued use of the platform constitutes acceptance of updated terms. 
                  We will notify users of significant changes via email or platform notifications.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">10. Contact Information</h2>
                <p className="text-muted-foreground mb-4">
                  For questions about these Terms of Service, please contact us at:
                </p>
                <div className="text-muted-foreground">
                  <p>Email: legal@applywizz.com</p>
                  <p>Address: 123 Business St, San Francisco, CA 94105</p>
                  <p>Phone: (555) 123-4567</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;