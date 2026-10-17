import Link from "next/link";

export default function LoginPage() {
  return (
    <main>
      <h1>Login</h1>
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
        <button type="submit">Log in</button>
      </form>
      <p>
        <Link href="/pages/create-account">Create account</Link>
      </p>
    </main>
  );
}
