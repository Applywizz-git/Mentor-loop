import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Last updated: January 1, 2024
          </p>

          <div className="space-y-8">
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Information We Collect</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-foreground">Personal Information</h3>
                    <p className="text-muted-foreground mb-2">We collect information you provide directly to us, such as:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Name, email address, and contact information</li>
                      <li>Professional background and experience</li>
                      <li>Payment information (processed securely through third parties)</li>
                      <li>Profile photos and other content you upload</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-foreground">Usage Information</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Session attendance and participation data</li>
                      <li>Platform usage patterns and preferences</li>
                      <li>Communication records between mentors and mentees</li>
                      <li>Device information and IP addresses</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">2. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Verify mentor credentials and maintain platform safety</li>
                  <li>Send technical notices, updates, and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Analyze usage patterns to improve user experience</li>
                  <li>Detect and prevent fraudulent or illegal activities</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Information Sharing</h2>
                <p className="text-muted-foreground mb-4">We do not sell, trade, or rent your personal information. We may share information in these situations:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li><strong>With mentors/mentees:</strong> Contact information necessary for scheduled sessions</li>
                  <li><strong>Service providers:</strong> Third parties who provide services on our behalf</li>
                  <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business transfers:</strong> In connection with mergers or acquisitions</li>
                  <li><strong>Consent:</strong> When you explicitly agree to sharing</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Data Security</h2>
                <p className="text-muted-foreground mb-4">
                  We implement appropriate security measures to protect your personal information:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and authentication measures</li>
                  <li>Secure payment processing through PCI-compliant providers</li>
                  <li>Employee training on data protection practices</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Your Rights and Choices</h2>
                <p className="text-muted-foreground mb-4">You have the right to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Access and update your personal information</li>
                  <li>Delete your account and associated data</li>
                  <li>Opt out of marketing communications</li>
                  <li>Request a copy of your data</li>
                  <li>Correct inaccurate information</li>
                  <li>Restrict processing of your data</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  To exercise these rights, please contact us at privacy@applywizz.com
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Cookies and Tracking</h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze platform usage and performance</li>
                  <li>Provide personalized content and recommendations</li>
                  <li>Ensure platform security</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  You can control cookie settings through your browser preferences.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Data Retention</h2>
                <p className="text-muted-foreground mb-4">
                  We retain your information for as long as necessary to provide services and fulfill legal obligations:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Account data: Until account deletion or 3 years of inactivity</li>
                  <li>Session records: 2 years for quality and dispute resolution</li>
                  <li>Payment information: As required by financial regulations</li>
                  <li>Support communications: 2 years after resolution</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">8. International Transfers</h2>
                <p className="text-muted-foreground mb-4">
                  Your information may be transferred to and processed in countries other than your own. 
                  We ensure appropriate safeguards are in place to protect your privacy rights.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Children's Privacy</h2>
                <p className="text-muted-foreground mb-4">
                  Our services are not intended for individuals under 18 years old. 
                  We do not knowingly collect personal information from children under 18.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">10. Changes to This Policy</h2>
                <p className="text-muted-foreground mb-4">
                  We may update this privacy policy periodically. We will notify you of significant changes 
                  by email or through our platform. Your continued use constitutes acceptance of the updated policy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">11. Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  If you have questions about this Privacy Policy, please contact us:
                </p>
                <div className="text-muted-foreground">
                  <p>Email: privacy@applywizz.com</p>
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

export default PrivacyPolicy;