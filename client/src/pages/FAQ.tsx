export default function FAQ() {
  const faqs = [
    { q: 'How do I enroll in a program?', a: 'Create an account, browse our programs, and click "Enroll Now" on your preferred track. Complete registration and payment in under 2 minutes.' },
    { q: 'What payment methods do you accept?', a: 'We accept UPI, credit/debit cards, net banking, and wallets through our secure RazorPay payment gateway.' },
    { q: 'How long does the internship last?', a: 'Programs range from 28 to 42 days depending on the track. Each program has a structured curriculum with daily modules.' },
    { q: 'How is the exam conducted?', a: 'Exams are conducted online with timed assessments. You can take the exam from anywhere. The exam includes multiple-choice questions based on your program topics.' },
    { q: 'What is the passing score?', a: 'You need to score 40% or higher to pass the exam and receive your certificate.' },
    { q: 'Can I retake the exam?', a: 'Yes, you can retake the exam if you don\'t pass on your first attempt. Contact support for retake scheduling.' },
    { q: 'How do I verify a certificate?', a: 'Use our public certificate verification page. Enter the certificate ID to view all details including name, program, grade, and score.' },
    { q: 'Can I get a refund?', a: 'Yes, we offer refunds within 7 days of enrollment if you haven\'t started the program. Contact our support team for assistance.' },
    { q: 'Are the internships recognized?', a: 'Our certificates are issued by IQIntern and can be verified through our platform. They demonstrate your skills and completion of the program.' },
    { q: 'How do I contact support?', a: 'You can reach us through the Contact page, email at support@iqintern.in, or WhatsApp during business hours (Mon-Sat, 9AM-8PM IST).' },
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
                <span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-600">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
