import BackButton from "../components/BackButton";

export default function Certificate() {
  return (
    <div className="w-full mb-52 h-screen flex flex-col">
      <BackButton />
      <div className="flex-grow flex justify-center items-center">
        <img src="/assets/cert-9Ec86KV7.jpg" alt="Certificate of Incorporation" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
