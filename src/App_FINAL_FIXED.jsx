// FINAL FIXED App.jsx (no SW cache + mobile-safe drag + clean taps)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, GripVertical, MoreVertical, Pencil, Trash2, X, Bell, Download, Cloud, CloudOff } from 'lucide-react';
import './index.css';

const STORAGE_KEY = 'monthly-bills-final';

function peso(v){return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(v||0);}
function daysDiff(d){const due=new Date(d);const t=new Date();due.setHours(0,0,0,0);t.setHours(0,0,0,0);return Math.round((due-t)/86400000);}
function getStatus(b){if(b.status==='Paid')return 'Paid';const d=daysDiff(b.dueDate);if(d<0)return 'Late';if(d<=5)return 'Due';return 'Unpaid';}

export default function App(){
const [bills,setBills]=useState(()=>{
  const s=localStorage.getItem(STORAGE_KEY);
  return s?JSON.parse(s):[];
});

useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(bills));},[bills]);

// 🔥 REMOVE OLD SERVICE WORKER CACHE
useEffect(()=>{
 if('serviceWorker' in navigator){
   navigator.serviceWorker.getRegistrations().then(regs=>{
     regs.forEach(r=>r.unregister());
   });
 }
},[]);

function toggle(id){
 setBills(prev=>prev.map(b=>b.id===id?{...b,status:b.status==='Paid'?'Unpaid':'Paid'}:b));
}

function add(){
 setBills(prev=>[...prev,{id:Date.now(),title:'New Bill',amount:1000,dueDate:new Date().toISOString().slice(0,10),status:'Unpaid'}]);
}

return(
<div className="app-shell">
<div className="phone-card">

<div className="top-section">
<button className="add-btn" onClick={add}><Plus/></button>
<h1 className="title">Monthly Bills</h1>
</div>

<div className="list-wrap">
<div className="list-card">
{bills.map(b=>{
 const s=getStatus(b);

 // 🚫 DISABLE DRAG ON MOBILE
 const isTouch=window.matchMedia('(pointer: coarse)').matches;
 const canDrag=!isTouch;

 return(
<div key={b.id} className="bill-row">
<div className="drag-col">{canDrag&&<GripVertical/>}</div>
<div className="name-col">{b.title}</div>
<div className="amount-col">{peso(b.amount)}</div>

<div className="status-col">
<button className={`pill ${s}`} onClick={()=>toggle(b.id)}>
{s}
</button>
</div>

</div>
);
})}
</div>
</div>

<div className="footer-section">
Every bill paid is one less worry.
</div>

</div>
</div>
);
}
