export function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-1 text-sm">Last updated: {lastUpdated}</p>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thunder Pro ("we," "our," or "us") is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information when you
            use our mobile application and services. Please read this policy carefully. If you
            disagree with its terms, please discontinue use of our application.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
          <p className="text-sm font-medium mb-1">Personal Information</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We collect information that you provide directly to us, including:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3">
            <li>Name, email address, and phone number</li>
            <li>Business information (company name, address, logo)</li>
            <li>Payment information (processed securely through Stripe)</li>
            <li>Profile photos and company logos</li>
            <li>Client and booking data you enter into the system</li>
          </ul>
          <p className="text-sm font-medium mb-1">Usage Information</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We automatically collect certain information about your device and how you interact with
            our app, including device type, operating system, app version, and usage patterns.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. How We Use Your Information</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send administrative messages and updates</li>
            <li>Respond to comments and questions</li>
            <li>Monitor and analyze trends and usage</li>
            <li>Detect and prevent fraudulent transactions</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Information Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            We do not sell your personal information. We may share your information with:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Service providers who assist in our operations (e.g., Stripe for payments)</li>
            <li>Law enforcement or government agencies when required by law</li>
            <li>Other parties with your consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Data Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We implement appropriate technical and organizational measures to protect your information
            against unauthorized access, alteration, disclosure, or destruction. However, no security
            system is impenetrable and we cannot guarantee the absolute security of your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Your Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal information</li>
            <li>Object to processing of your personal information</li>
            <li>Request restriction of processing</li>
            <li>Data portability</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Data Retention</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We retain your personal information for as long as necessary to provide our services and
            comply with our legal obligations. When your account is deleted, we will delete or
            anonymize your personal information within 30 days, unless we are required to retain it
            by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">8. International Transfers</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your information may be transferred to and maintained on servers located outside of your
            country. We ensure that such transfers comply with applicable data protection laws and
            implement appropriate safeguards to protect your information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">9. Cookies and Tracking</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use cookies and similar tracking technologies to track activity on our service and
            hold certain information. You can instruct your browser to refuse all cookies or to
            indicate when a cookie is being sent. However, if you do not accept cookies, you may
            not be able to use some portions of our service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">10. Children's Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our services are not directed to children under 13. We do not knowingly collect personal
            information from children under 13. If you become aware that a child has provided us
            with personal information, please contact us so we can take necessary steps to remove
            that information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">11. Changes to This Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy on this page and updating the "Last updated" date. You
            are advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">12. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have any questions about this Privacy Policy or our privacy practices, please
            contact us at:
          </p>
          <div className="mt-3 text-sm text-muted-foreground space-y-1">
            <p>Thunder Pro LLC</p>
            <p>Los Angeles, CA</p>
            <p>
              Privacy inquiries:{" "}
              <a
                href="mailto:privacy@thunderpro.co"
                className="text-primary hover:underline"
              >
                privacy@thunderpro.co
              </a>
            </p>
            <p>
              General:{" "}
              <a
                href="mailto:info@thunderpro.co"
                className="text-primary hover:underline"
              >
                info@thunderpro.co
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
