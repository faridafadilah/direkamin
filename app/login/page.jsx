import LoginButton from '@/components/LoginButton';

export default function Login() {
  return (
    <section className="hero loginbox">
      <p className="brand">Direkamin</p>
      <h1>Ngantuk boleh,<br />materi jangan lewat.</h1>
      <p className="lead">Masuk dulu supaya rekaman dan ringkasan kuliahmu tersimpan rapi dan hanya bisa dilihat olehmu.</p>
      <LoginButton />
    </section>
  );
}
