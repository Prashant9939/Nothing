import { Link } from 'react-router-dom';

export default function FAQ() {
  const faqs = [
    { q: 'How do I enroll in a program?', a: <>Create an account, <Link to="/programs" className="text-orange-600 font-medium hover:underline">browse our programs</Link>, and click "Enroll Now" on your preferred track. Complete registration and payment in under 2 minutes.</> },
    { q: 'What payment methods do you accept?', a: 'We accept UPI, credit/debit cards, net banking, and wallets through our secure RazorPay payment gateway.' },
    { q: 'How long does the internship last?', a: <>Programs range from 28 to 42 days depending on the track. Each <Link to="/programs" className="text-orange-600 font-medium hover:underline">program</Link> has a structured curriculum with daily modules.</> },
    { q: 'How is the exam conducted?', a: 'Exams are conducted online with timed assessments. You can take the exam from anywhere. The exam includes multiple-choice questions based on your program topics.' },
    { q: 'What is the passing score?', a: 'You need to score 40% or higher to pass the exam and receive your certificate.' },
    { q: 'Can I retake the exam?', a: <>Yes, you can retake the exam if you don't pass on your first attempt. <Link to="/contact" className="text-orange-600 font-medium hover:underline">Contact support</Link> for retake scheduling.</> },
    { q: 'How do I verify a certificate?', a: <>Use our <Link to="/certification" className="text-orange-600 font-medium hover:underline">public certificate verification page</Link>. Enter the certificate ID to view all details including name, program, grade, and score.</> },
    { q: 'Can I get a refund?', a: <>Yes, we offer refunds within 7 days of enrollment if you haven't started the program. <Link to="/contact" className="text-orange-600 font-medium hover:underline">Contact our support team</Link> for assistance.</> },
    { q: 'Are the internships recognized?', a: <>Our certificates are issued by IQIntern and can be verified through our platform. They demonstrate your skills and completion of the program. <Link to="/about" className="text-orange-600 font-medium hover:underline">Learn more about IQIntern</Link>.</> },
    { q: 'How do I contact support?', a: <>You can reach us through the <Link to="/contact" className="text-orange-600 font-medium hover:underline">Contact page</Link>, email at support@iqintern.in, or WhatsApp during business hours (Mon-Sat, 9AM-8PM IST).</> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center reveal reveal-pop">Frequently Asked Questions</h1>
        <p className="text-gray-500 text-center mb-10 reveal reveal-pop" style={{ transitionDelay: '120ms' }}>Quick answers to common queries about our platform and programs.</p>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="bg-white border border-gray-200 rounded-lg group reveal reveal-pop" style={{ transitionDelay: `${200 + i * 70}ms` }}>
              <summary className="p-4 cursor-pointer font-semibold text-sm hover:bg-gray-50 transition-colors list-none flex justify-between items-center">
                {faq.q}
                <span className="text-gray-500 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-600">{faq.a}</div>
            </details>
          ))}
        </div>

        {/* Still stuck? Route visitors to the pages that answer the rest. */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6 text-center reveal reveal-pop">
          <p className="text-sm text-gray-600 mb-4">Didn't find your answer? Our team replies within 24 hours.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors">Contact Us</Link>
            <Link to="/programs" className="px-5 py-2.5 border border-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">Browse Programs</Link>
            <Link to="/certification" className="px-5 py-2.5 border border-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">Verify a Certificate</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
