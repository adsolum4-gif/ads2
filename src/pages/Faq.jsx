import { motion } from "framer-motion";
import { FaPlay, FaWallet, FaLock, FaShieldAlt, FaBox, FaLayerGroup, FaUniversity, FaHandshake, FaUserPlus } from "react-icons/fa";
import BackButton from "../components/BackButton";
import { fadeIn } from "../utils/motion";

const sections = [
  {
    icon: FaPlay,
    color: "text-red-500",
    title: "I. Start Optimization Task",
    items: [
      <>A minimum <span className="font-semibold text-red-500">100 USD</span> recharge is required to reset the account to start a new task.</>,
      "Once all tasks are completed, the user must request a full withdrawal before resetting the account.",
    ],
  },
  {
    icon: FaWallet,
    color: "text-blue-500",
    title: "II. Withdrawals",
    items: [
      <>If the withdrawal amount is <span className="font-semibold text-blue-500">10,000 USD</span> or more, please contact customer service.</>,
      [
        "VIP1: Max withdrawal is 5,000 USD",
        "VIP2: Max withdrawal is 10,000 USD",
        "VIP3: Max withdrawal is 20,000 USD",
        "VIP4: Max withdrawal is 40,000 USD",
        "VIP5: Max withdrawal is 80,000 USD",
        "VIP6: Max withdrawal is 150,000 USD",
        "VIP7: Max withdrawal is 300,000 USD",
        "VIP8: Max withdrawal is 500,000 USD",
        "VIP9: Max withdrawal is 750,000 USD",
        "VIP10: Max withdrawal is 1,000,000 USD",
      ],
      "After all tasks are completed, users can apply for a full withdrawal.",
      "Withdrawals cannot be requested without task completion.",
    ],
  },
  {
    icon: FaLock,
    color: "text-green-500",
    title: "III. Funds",
    items: ["Funds are securely held in the user’s account.", "All data processing is handled automatically to prevent losses.", "The platform assumes responsibility for any accidental losses."],
  },
  {
    icon: FaShieldAlt,
    color: "text-purple-500",
    title: "IV. Account Security",
    items: ["Do not disclose your password or security code.", "Avoid using personal information as security codes.", "If you forget your credentials, contact customer service for reset."],
  },
  {
    icon: FaBox,
    color: "text-yellow-500",
    title: "V. Normal Products",
    items: ["Normal and combined earnings vary based on user type (VIP1 to VIP10).", "VIP1: 0.5% profit on normal products; higher tiers earn more.", "Funds and earnings are credited after each completed task."],
  },
  {
    icon: FaLayerGroup,
    color: "text-teal-500",
    title: "VI. Combination Tasks",
    items: ["Combination products may include multiple items, with higher returns.", "All funds are used for product trade submissions in combination tasks.", "Combination products cannot be canceled or skipped."],
  },
  {
    icon: FaUniversity,
    color: "text-indigo-500",
    title: "VII. Deposit",
    items: ["The deposit amount is decided by the user.", "Confirm deposit addresses with customer service.", "The platform is not responsible for incorrect deposits."],
  },
  {
    icon: FaHandshake,
    color: "text-pink-500",
    title: "VIII. Cooperation of Merchants",
    items: ["Delays in completing tasks may impact merchant operations.", "Merchants provide deposit details for user deposits."],
  },
  {
    icon: FaUserPlus,
    color: "text-orange-500",
    title: "IX. Invitation",
    items: ["Only VIP3 users with 10 days of activity can invite new users.", "All product optimizations must be complete before inviting others."],
  },
];

export default function Faq() {
  return (
    <div className="bg-gray-50 min-h-screen p-2 md:p-12 font-sans text-gray-700">
      <BackButton />
      <h1 className="text-4xl font-bold text-center mb-10 text-red-600">FAQ</h1>
      {sections.map((section, i) => (
        <motion.section
          key={section.title}
          initial={fadeIn("up").initial}
          whileInView={fadeIn("up", i + 1).animate}
          viewport={{ once: false, amount: 0.2 }}
          className={`${i === sections.length - 1 ? "mb-52" : "mb-10"} p-6 bg-white rounded-lg shadow-md`}
        >
          <div className="flex items-center mb-4">
            <section.icon className={`${section.color} text-3xl mr-3`} />
            <h2 className="text-2xl font-semibold text-gray-800">{section.title}</h2>
          </div>
          <ul className="ml-8 list-disc list-inside">
            {section.items.map((item, idx) =>
              Array.isArray(item) ? (
                <ul key={idx} className="ml-8 list-disc list-inside">
                  {item.map((sub) => (
                    <li key={sub}>{sub}</li>
                  ))}
                </ul>
              ) : (
                <li key={idx}>{item}</li>
              )
            )}
          </ul>
        </motion.section>
      ))}
    </div>
  );
}
