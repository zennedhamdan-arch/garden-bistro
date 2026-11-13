import { hashPassword } from "../src/lib/auth";
if (!process.argv[2] || process.argv[2].length < 14)
  throw new Error("Use a password of at least 14 characters");
console.log(hashPassword(process.argv[2]));
