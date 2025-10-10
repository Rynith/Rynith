"use client";
import React from "react";
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props:any){ super(props); this.state={hasError:false}; }
  static getDerivedStateFromError(){ return { hasError: true }; }
  componentDidCatch(err: any){ console.error("UI Error:", err); }
  render(){ return this.state.hasError ? <div className="p-6 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">Something went wrong.</div> : this.props.children; }
}
