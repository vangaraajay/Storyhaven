import Link from "next/link";

export default function CreateAccountPage() {
  return (
    <main>
      <h1>Create account</h1>
      <p>
        <Link href="/">Home</Link>
      </p>
      <form>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" />
        </div>
        <button type="submit">Create account</button>
      </form>
      <p>
        <Link href="/pages/login">Go back to login page</Link>
      </p>
    </main>
  );
}
