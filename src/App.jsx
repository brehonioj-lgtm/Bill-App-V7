import React from "react";

export default function App() {
  const bills = [
    { name: "Paylater", amount: 1296, status: "Due" },
    { name: "Kuryente", amount: 600, status: "Due" },
    { name: "Paluwagan", amount: 2500, status: "Unpaid" },
    { name: "Wifey", amount: 4000, status: "Late" },
    { name: "Wifi", amount: 1000, status: "Unpaid" },
    { name: "Netflix", amount: 295, status: "Paid" },
    { name: "Spotify", amount: 149, status: "Paid" }
  ];

  return (
    <div className="container">
      <h1>Monthly Bills</h1>
      <p className="subtitle">Pay today, stress less tomorrow.</p>

      <div className="summary">
        <span>Paid ₱444</span>
        <span>Unpaid ₱9,396</span>
      </div>

      <div className="list">
        {bills.map((b, i) => (
          <div key={i} className={"item " + b.status.toLowerCase()}>
            <span className="name">{b.name}</span>
            <span>₱{b.amount}</span>
            <span className="status">{b.status}</span>
          </div>
        ))}
      </div>

      <footer className="footer">
        <p>Every bill paid is one less worry.</p>
        <p>One step closer to zero balance.</p>
      </footer>
    </div>
  );
}
