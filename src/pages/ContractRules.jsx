import { motion } from "framer-motion";
import { FaRedo, FaShieldAlt, FaLock, FaRandom, FaGavel, FaStore, FaExclamationTriangle, FaClock, FaList } from "react-icons/fa";
import BackButton from "../components/BackButton";
import { fadeIn } from "../utils/motion";

const rules = [
  {
    icon: FaRedo,
    color: "text-red-500",
    title: "1. Account Reset",
    body: (
      <>
        <p className="ml-8 mb-2">
          To reset your account, you must complete all improvement tasks. The minimum reset amount is <span className="font-semibold text-red-500">100 USD</span>, excluding the account balance.
        </p>
        <p className="ml-12">Contact customer service after task completion and withdrawal to reset your account.</p>
      </>
    ),
  },
  {
    icon: FaShieldAlt,
    color: "text-blue-500",
    title: "2. User Withdrawals & Security",
    body: (
      <ul className="ml-12 list-disc list-inside">
        <li>Complete all optimization tasks to meet withdrawal requirements.</li>
        <li>Withdrawals are processed automatically by the system to avoid any loss of funds.</li>
        <li>The Platform ensures user funds' safety, covering any accidental loss.</li>
      </ul>
    ),
  },
  {
    icon: FaLock,
    color: "text-green-500",
    title: "3. Security & Privacy",
    body: (
      <ul className="ml-12 list-disc list-inside">
        <li>Keep your account password and security code private. The Platform is not liable for losses due to disclosure.</li>
        <li>All users are advised to keep accounts secure to avoid accidental disclosure.</li>
        <li>Avoid using easily guessable passwords like birthdays or ID numbers.</li>
        <li>If you forget your password, reset it by contacting customer service and change it afterward.</li>
      </ul>
    ),
  },
  {
    icon: FaRandom,
    color: "text-yellow-500",
    title: "4. Optimization Tasks",
    body: (
      <ul className="ml-12 list-disc list-inside">
        <li>Optimization tasks are randomly assigned and cannot be changed, canceled, controlled, or skipped.</li>
        <li>The system distributes improvement products randomly without manual changes.</li>
      </ul>
    ),
  },
  {
    icon: FaGavel,
    color: "text-orange-500",
    title: "5. Legal Compliance",
    body: <p className="ml-8">Legal action will be taken if there is any misuse of the account.</p>,
  },
  {
    icon: FaStore,
    color: "text-purple-500",
    title: "6. Merchant Rules",
    body: <p className="ml-8">Each deposit must be confirmed with customer service within 30 minutes to ensure the correct merchant's USD address.</p>,
  },
  {
    icon: FaExclamationTriangle,
    color: "text-indigo-500",
    title: "7. Deposit Responsibility",
    body: <p className="ml-8">The platform will not be held responsible for any deposits made to the wrong account.</p>,
  },
  {
    icon: FaClock,
    color: "text-teal-500",
    title: "8. Task Completion",
    body: <p className="ml-8">Each time improvement task must be completed within 8 hours. Failure to do so without requesting an extension may result in a lower credit score.</p>,
  },
  {
    icon: FaList,
    color: "text-yellow-500",
    title: "9. Requirements",
    body: (
      <ul className="ml-12 list-disc list-inside">
        <li>The minimum amount to initiate the 2nd data set is 100 USDT (Beginner Level).</li>
        <li>Each member is eligible for the reset bonus based on the corresponding initial deposit for the 2nd or 3rd data set. (Only on day 2 data set)</li>
        <li>The reset bonus will be credited to the member's account balance alongside the initial deposit amount.</li>
      </ul>
    ),
  },
];

export default function ContractRules() {
  return (
    <div className="bg-gray-50 min-h-screen p-2 md:p-12 font-sans text-gray-700">
      <BackButton />
      <h1 className="text-3xl font-bold text-center mb-8 text-red-600">Contract Rules</h1>
      {rules.map((rule, i) => (
        <motion.section
          key={rule.title}
          initial={fadeIn("up").initial}
          whileInView={fadeIn("up", i + 1).animate}
          viewport={{ once: false, amount: 0.2 }}
          className={`${i === rules.length - 1 ? "md:mb-6 mb-52" : "mb-6"} p-4 bg-white rounded-lg shadow-md`}
        >
          <div className="flex items-center mb-3">
            <rule.icon className={`${rule.color} text-2xl mr-3`} />
            <h2 className="text-xl font-semibold text-gray-800">{rule.title}</h2>
          </div>
          {rule.body}
        </motion.section>
      ))}
    </div>
  );
}
