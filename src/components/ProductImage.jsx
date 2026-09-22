import { useEffect, useMemo, useState } from "react";

const BY_NAME = {
  "Wireless Earbuds": "/assets/products/earbuds.jpg",
  "Smart Watch": "/assets/products/watch.jpg",
  "Bluetooth Speaker": "/assets/products/speaker.jpg",
  "Phone Case": "/assets/products/phone.jpg",
  "Power Bank": "/assets/products/powerbank.jpg",
  "Laptop Stand": "/assets/products/laptop.jpg",
  "Wireless Mouse": "/assets/products/mouse.jpg",
  "Wireless Mouse...": "/assets/products/mouse.jpg",
  "USB-C Hub": "/assets/products/hub.jpg",
  "Desk Lamp": "/assets/products/lamp.jpg",
  "Wireless Keyboard": "/assets/products/keyboard.jpg",
  "Studio Headphones": "/assets/products/headphones.jpg",
  "Digital Camera": "/assets/products/camera.jpg",
  "Tablet": "/assets/products/tablet.jpg",
  "Wi-Fi Router": "/assets/products/router.jpg",
  "Mini Drone": "/assets/products/drone.jpg",
  "Game Console": "/assets/products/gamepad.jpg",
  "USB Microphone": "/assets/products/mic.jpg",
  "HD Monitor": "/assets/products/monitor.jpg",
  "Sunglasses": "/assets/products/glasses.jpg",
  "Instant Camera": "/assets/products/polaroid.jpg",
  "Desk Fan": "/assets/products/fan.jpg",
  "Travel Backpack": "/assets/products/backpack.jpg",
  "Smartphone": "/assets/products/smartphone.jpg",
  "Water Bottle": "/assets/products/bottle.jpg",
  "Laptop": "/assets/products/notebook.jpg",
  "VR Headset": "/assets/products/vr.jpg",
  "Mini Projector": "/assets/products/projector.jpg",
  "Toothbrush": "/assets/products/toothbrush.jpg",
  "Running Shoes": "/assets/products/sneakers.jpg",
  "Leather Wallet": "/assets/products/wallet.jpg",
  "Hair Dryer": "/assets/products/hairdryer.jpg",
  "Alarm Clock": "/assets/products/clock.jpg",
  "USB Cable": "/assets/products/cable.jpg",
  "Bathroom Scale": "/assets/products/scale.jpg",
  "Tea Kettle": "/assets/products/kettle.jpg",
  "Air Fryer": "/assets/products/airfryer.jpg",
  "Coffee Maker": "/assets/products/coffeemaker.jpg",
  "Beard Trimmer": "/assets/products/shaver.jpg",
  "Kitchen Blender": "/assets/products/blender.jpg",
  "Portable SSD": "/assets/products/ssd.jpg",
  "USB Webcam": "/assets/products/webcam.jpg",
  "Toaster": "/assets/products/toaster.jpg",
  "Ethernet Cable": "/assets/products/hdmi.jpg",
  "Travel Umbrella": "/assets/products/umbrella.jpg",
  "Vacuum Cleaner": "/assets/products/vacuum.jpg",
  "Laptop Charger": "/assets/products/charger.jpg",
  "Fitness Band": "/assets/products/band.jpg",
  "Yoga Mat": "/assets/products/yogamat.jpg",
  "Gaming Laptop": "/assets/products/gaminglaptop.jpg",
  "DSLR Camera": "/assets/products/dslr.jpg",
  "Flagship Phone": "/assets/products/flagship.jpg",
  "Camera Drone": "/assets/products/prodrone.jpg",
};

export default function ProductImage({ src, name, alt, className = "" }) {
  const candidates = useMemo(() => {
    const mapped = name ? BY_NAME[name] : null;
    return [...new Set([src, mapped].filter(Boolean))];
  }, [src, name]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [src, name]);
  const current = candidates[index];

  if (!current) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-rose-50 to-red-100 text-red-700 font-semibold ${className}`}>
        {(name || alt || "P").slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={current}
      alt={alt || name || "Product"}
      className={className}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
