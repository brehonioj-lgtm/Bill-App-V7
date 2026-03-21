// App.jsx (FULL FIXED VERSION - alerts + toggle issues resolved)

import React, { useEffect, useState } from 'react';
import './index.css';
import { Bell } from 'lucide-react';

export default function App() {
  const [bills, setBills] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('bills') || '[]');
    setBills(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem('bills', JSON.stringify(bills));
  }, [bills]);

  function enableNotifications() {
    Notification.requestPermission().then((perm) => {
      setNotificationPermission(perm);
    });
  }

  function toggleStatus(id) {
    setBills((prev) => {
      const updated = prev.map((b) =>
        b.id === id
          ? { ...b, status: b.status === 'Paid' ? 'Unpaid' : 'Paid' }
          : b
      );
      return updated;
    });
  }

  return (
    <div className="app">
      <div className="top-section">
        <h1>Monthly Bills</h1>

        <div className="utility-row">
          <button
            className="mini-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              enableNotifications();
            }}
            style={{
              position: 'relative',
              zIndex: 9999,
              pointerEvents: 'auto'
            }}
          >
            <Bell size={15} />
            {notificationPermission === 'granted' ? 'Alerts On' : 'Enable Alerts'}
          </button>
        </div>
      </div>

      <div className="bill-list">
        {bills.map((bill) => (
          <div key={bill.id} className="bill-row">
            <span>{bill.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleStatus(bill.id);
              }}
            >
              {bill.status}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
