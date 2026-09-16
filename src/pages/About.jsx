import { motion } from "framer-motion";
import { FaBookOpen, FaEye, FaBullseye, FaAward } from "react-icons/fa";
import BackButton from "../components/BackButton";
import { fadeIn } from "../utils/motion";

export default function About() {
  return (
    <div className="bg-gray-50 min-h-screen p-2 md:p-12 font-sans text-gray-700">
      <BackButton />
      <h1 className="text-4xl font-bold text-center mb-10 text-red-600">About Us</h1>
      <Section icon={FaBookOpen} color="text-red-500" title="Our Story" delay={1}>
        <p className="ml-8 mb-4">
          Adsterra started with a friendship and grew to be a successful business that still retains its core values: putting great emphasis on teamwork, transparency, commitment, consistency, quality, and always being ready to support and help both clients and colleagues.
        </p>
        <p className="ml-8">
          Founded in 2013 by professional affiliate marketers and webmasters with over 20 years of experience, Adsterra has developed into a trusted name in the industry. What started as a shared vision has now blossomed into a platform that blends technology and human intelligence to deliver excellence.
        </p>
      </Section>
      <Section icon={FaEye} color="text-yellow-500" title="Our Vision" delay={2}>
        <p className="ml-8 mb-4">
          "We were friends at school and university, brought together by our shared interest in technology and marketing, as well as the desire to find the best way to attain self-realization and success. While striving to grow financially, we didn’t want to get tangled up in the complex corporate culture."
        </p>
        <p className="ml-8">
          Adsterra’s founders wanted to create something new, both for themselves and for the market. The result is a company with a professional IT department, experienced account managers, and a team of dedicated employees who strive to provide outstanding support and solutions for advertisers and publishers.
        </p>
      </Section>
      <Section icon={FaBullseye} color="text-green-500" title="Our Mission" delay={4}>
        <p className="ml-8 mb-4">
          We connect advertisers and publishers of all sizes globally, helping them grow their capital, develop their skills, and improve as professionals to ensure a successful present and future.
        </p>
        <p className="ml-8">
          By setting high traffic and service quality standards, we contribute to the development of the adtech market. Through our innovative products, we aim to foster growth, share knowledge, and collaborate with the community to build a brighter future for all.
        </p>
      </Section>
      <Section icon={FaAward} color="text-blue-500" title="Industry Recognition" delay={3} last>
        <p className="ml-8 mb-4">
          Today, Adsterra is a well-known brand with a strong reputation and has been recognized by numerous bloggers and affiliates as one of the top adtech platforms. Our blend of innovative technology and human intelligence makes us a trusted partner in the industry.
        </p>
        <p className="ml-8">
          We believe that our dedication to excellence and support for both advertisers and publishers is what sets us apart and drives our success.
        </p>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, color, title, children, delay, last }) {
  return (
    <motion.section
      initial={fadeIn("up").initial}
      whileInView={fadeIn("up", delay).animate}
      viewport={{ once: false, amount: 0.2 }}
      className={`${last ? "mb-52" : "mb-10"} p-6 bg-white rounded-lg shadow-md`}
    >
      <div className="flex items-center mb-4">
        <Icon className={`${color} text-3xl mr-3`} />
        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}
