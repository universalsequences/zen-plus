import Home from "@/components/Home";
import "@/styles/styles.scss";
import "./globals.css";
import React, { useState } from "react";
import { NavProvider } from "@/contexts/NavContext";
import Store from "./store";

export default function RootRoute() {
  return (
    <Store>
      <NavProvider showDocs={false}>
        <Home />
      </NavProvider>
    </Store>
  );
}
