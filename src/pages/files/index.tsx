import Home from "@/components/Home";
import "@/styles/styles.scss";
import "../globals.css";
import Store from "../store";
import React, { useState } from "react";
import { NavProvider } from "@/contexts/NavContext";

export default function Files() {
  return (
    <Store>
      <NavProvider showDocs={false}>
        <Home />
      </NavProvider>
    </Store>
  );
}
