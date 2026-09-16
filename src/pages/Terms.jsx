export default function Terms() {
  return (
    <div className="bg-gray-50 p-2 md:p-12 font-sans text-gray-700 h-screen overflow-y-auto">
      <h1 className="text-3xl font-bold text-center mb-8 text-red-600">Terms and Conditions</h1>
      <div className="space-y-6 text-gray-800 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Account Reset</h2>
          <p>
            To reset your account, you must complete all improvement tasks. The minimum reset amount is{" "}
            <span className="font-semibold text-red-500">100 USD</span>, excluding the account balance.
          </p>
          <p>Contact customer service after task completion and withdrawal to reset your account.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">2. User Withdrawals & Security</h2>
          <ul className="list-disc list-inside">
            <li>Complete all optimization tasks to meet withdrawal requirements.</li>
            <li>Withdrawals are processed automatically by the system to avoid any loss of funds.</li>
            <li>The Platform ensures user funds' safety, covering any accidental loss.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">3. Security & Privacy</h2>
          <ul className="list-disc list-inside">
            <li>Keep your account password and security code private. The Platform is not liable for losses due to disclosure.</li>
            <li>All users are advised to keep accounts secure to avoid accidental disclosure.</li>
            <li>Avoid using easily guessable passwords like birthdays or ID numbers.</li>
            <li>If you forget your password, reset it by contacting customer service and change it afterward.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">4. Optimization Tasks</h2>
          <ul className="list-disc list-inside">
            <li>Optimization tasks are randomly assigned and cannot be changed, canceled, controlled, or skipped.</li>
            <li>The system distributes improvement products randomly without manual changes.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">5. Legal Compliance</h2>
          <p>Legal action will be taken if there is any misuse of the account.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">6. Merchant Rules</h2>
          <p>Each deposit must be confirmed with customer service within 30 minutes to ensure the correct merchant's USD address.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">7. Deposit Responsibility</h2>
          <p>The platform will not be held responsible for any deposits made to the wrong account.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">8. Task Completion</h2>
          <p>Each time improvement task must be completed within 8 hours. Failure to do so without requesting an extension may result in a lower credit score.</p>
        </section>
        <section className="md:mb-2 mb-52">
          <h2 className="text-xl font-semibold mb-2">9. Requirements</h2>
          <ul className="list-disc list-inside">
            <li>The minimum amount to initiate the 2nd data set is 100 USDT (Beginner Level).</li>
            <li>Each member is eligible for the reset bonus based on the corresponding initial deposit for the 2nd or 3rd data set. (Only on day 2 data set)</li>
            <li>The reset bonus will be credited to the member's account balance alongside the initial deposit amount.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
