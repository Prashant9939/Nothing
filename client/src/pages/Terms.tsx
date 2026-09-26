import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Terms &amp; Conditions</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: September 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <p className="text-gray-600 text-sm leading-relaxed">
            These Terms &amp; Conditions govern your use of IQIntern, including our internship programs,
            training courses, evaluation exams and certification services. Please read them carefully.
            By creating an account or using the platform you agree to these terms and to our{' '}
            <Link to="/privacy" className="text-orange-600 font-medium hover:underline">Privacy Policy</Link>,
            which explains how we handle your personal data.
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 text-sm leading-relaxed">By accessing and using IQIntern, you agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Services</h2>
            <p className="text-gray-600 text-sm leading-relaxed">IQIntern provides online internship programs, training courses, and certification services. We reserve the right to modify or discontinue any service at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-gray-600 text-sm leading-relaxed">You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate and complete information during registration. One account per user.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Information We Collect</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              To run the platform we collect only the information you provide during registration and
              enrollment: your full name, email address, phone number, gender, date of birth, university,
              college, course, session/year, roll number, registration number, guardian details (name,
              phone and relation) and your password. When you enroll in a paid program we also process
              payment details through our payment gateway (we never see or store your card number, CVV
              or UPI PIN). As you use the platform we record program activity such as attendance, exam
              answers and scores, certificate issuances, plus basic technical logs (IP address, browser
              type and device) for security purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Why We Need This Data</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We ask for this data because the platform cannot function without it. Academic details are
              needed to enroll you in the right program and print them on your certificate; guardian
              details are required as a safety contact for minor and young adult participants; your
              email/phone are needed to sign you in, send receipts, exam updates and certificate links;
              date of birth and gender are used for eligibility checks and reporting; payment
              information is required to complete a purchase; and technical logs let us detect fraud,
              unauthorised access and abuse. Providing accurate information is a condition of using
              IQIntern — if you do not provide it, we cannot create your account, verify your identity
              or issue certificates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. What We Do With Your Data</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We use your data for specific, limited purposes: to create and manage your account;
              deliver the programs you enroll in; track attendance and evaluate exams; issue,
              store and verify certificates (employers can validate a certificate ID on our public
              verification page); process payments and send invoices; send transactional messages such
              as enrollment confirmations, payment receipts and results; provide customer support; and
              protect the platform against fraud and misuse. Where you have opted in, we may send
              occasional announcements about new programs, which you can unsubscribe from at any time.
              We aggregate anonymised, non-identifying statistics (for example pass rates and
              enrollment trends) to improve our programs. We do not sell, rent or trade your personal
              data to third parties, and we only share it with service providers strictly needed to
              operate the platform (such as the payment processor) or when required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Security &amp; Retention</h2>
            <p className="text-gray-600 text-sm leading-relaxed">We implement industry-standard security measures including encryption, secure protocols, and access controls to protect your data. We retain your data for as long as your account is active or as needed to provide services and issue verifiable certificates. You may request correction or deletion of your personal data by contacting support.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Payments &amp; Refunds</h2>
            <p className="text-gray-600 text-sm leading-relaxed">All payments are processed through our secure payment gateway. Refunds are available within 7 days of enrollment if the program has not been started. Contact support for refund requests.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Certificates</h2>
            <p className="text-gray-600 text-sm leading-relaxed">Certificates are issued upon successful completion of the program and passing the evaluation exam. Certificates are non-transferable and subject to verification. Misrepresentation of certificate details may result in cancellation of the certificate and termination of your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Intellectual Property</h2>
            <p className="text-gray-600 text-sm leading-relaxed">All course materials, content, and intellectual property on the platform are owned by IQIntern and protected by copyright laws. Unauthorized reproduction is prohibited.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Limitation of Liability</h2>
            <p className="text-gray-600 text-sm leading-relaxed">IQIntern shall not be liable for any indirect, incidental, or consequential damages arising from the use of our platform or services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes to Terms</h2>
            <p className="text-gray-600 text-sm leading-relaxed">We reserve the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              If you have questions about these Terms &amp; Conditions or how we use your data, contact
              us at support@iqintern.in or through the{' '}
              <Link to="/contact" className="text-orange-600 font-medium hover:underline">contact page</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
