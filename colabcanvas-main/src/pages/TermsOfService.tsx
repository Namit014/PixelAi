import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p>
              By accessing or using Colab, you agree to be bound by these Terms of Service and all 
              applicable laws and regulations. If you do not agree with any of these terms, you are 
              prohibited from using this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Use License</h2>
            <p className="mb-3">
              Permission is granted to use Colab for personal or commercial design projects, subject to 
              the following restrictions:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must not use the service for any illegal or unauthorized purpose</li>
              <li>You must not violate any laws in your jurisdiction</li>
              <li>You must not attempt to gain unauthorized access to our systems</li>
              <li>You must not transmit any malicious code or harmful content</li>
              <li>You must not attempt to reverse engineer or copy our AI models</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
            <p className="mb-3">When you create an account with us, you must provide accurate and complete information. You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring your account information remains current and accurate</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Intellectual Property Rights</h2>
            <p className="mb-3">
              <strong>Your Content:</strong> You retain all rights to the designs and content you create 
              using Colab. By using our service, you grant us a limited license to host, store, and process 
              your content solely to provide the service.
            </p>
            <p>
              <strong>Our Platform:</strong> The Colab platform, including its AI models, algorithms, 
              design, and code, are protected by intellectual property laws and remain our exclusive property.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Subscription and Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscription fees are billed in advance on a recurring basis</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
              <li>You can cancel your subscription at any time from your account settings</li>
              <li>Upon cancellation, you will retain access until the end of your billing period</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">AI-Generated Content</h2>
            <p>
              Our AI design tools generate content based on your inputs and prompts. While we strive for 
              accuracy and quality, we do not guarantee that AI-generated designs will meet your specific 
              requirements or be free from errors. You are responsible for reviewing and modifying all 
              AI-generated content before use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Prohibited Uses</h2>
            <p className="mb-3">You agree not to use Colab to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create content that is illegal, harmful, or violates third-party rights</li>
              <li>Generate misleading, deceptive, or fraudulent content</li>
              <li>Harass, abuse, or harm others</li>
              <li>Infringe on intellectual property rights</li>
              <li>Distribute spam or malware</li>
              <li>Circumvent usage limits or access controls</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access to our 
              services. We reserve the right to modify, suspend, or discontinue any part of the service 
              with or without notice. We are not liable for any service interruptions or data loss.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Colab shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages resulting from your use or inability to use the 
              service. Our total liability shall not exceed the amount you paid us in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for 
              any reason, including if you breach these Terms. Upon termination, your right to use the 
              service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of material 
              changes via email or through the service. Your continued use of the service after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws, without 
              regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us through our support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
