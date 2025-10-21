import { forbidden } from "next/navigation";

export default function ForbiddenTrigger() {
  forbidden();
  return null;
}
