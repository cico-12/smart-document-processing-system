import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${
        className ?? ""
      }`}
      {...props}
    />
  );
}