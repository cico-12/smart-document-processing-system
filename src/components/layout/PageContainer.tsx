type PageContainerProps = {
  children: React.ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
  return <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>;
}