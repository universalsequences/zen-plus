"use client";
import { useRouter } from "next/router";
import App from "../App";

export default function Reo() {
  const router = useRouter();
  const { id } = router.query;

  let projectId = id !== undefined && id[0] ? id[0] : undefined;

  return (
    <>
      <App projectId={projectId} />
    </>
  );
}
