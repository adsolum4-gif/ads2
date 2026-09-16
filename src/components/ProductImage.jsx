import { useEffect, useMemo, useState } from "react";

const BY_NAME = {
  "Wireless Earbuds": "/assets/products/earbuds.jpg",
  "Smart Watch": "/assets/products/watch.jpg",
  "Bluetooth Speaker": "/assets/products/speaker.jpg",
  "Phone Case": "/assets/products/phone.jpg",
  "Power Bank": "/assets/products/powerbank.jpg",
  "Laptop Stand": "/assets/products/laptop.jpg",
  "Wireless Mouse": "/assets/products/mouse.jpg",
  "USB-C Hub": "/assets/products/hub.jpg",
  "Desk Lamp": "/assets/products/lamp.jpg",
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
