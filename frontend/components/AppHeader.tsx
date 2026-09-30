import Logo from "@/components/Logo";

/** The nav item to highlight: a new document, or My documents (including a reopened one). */
export type Section = "new" | "documents";

interface AppHeaderProps {
  email: string;
  section: Section;
  onNewDocument: () => void;
  onShowDocuments: () => void;
  onSignOut: () => void;
}

/** The signed-in app's top bar: brand, navigation, and the account's email with sign out. */
export default function AppHeader({ email, section, onNewDocument, onShowDocuments, onSignOut }: AppHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-x-8 border-b border-rule bg-paper px-4 sm:px-6">
      <div className="py-3">
        <Logo />
      </div>
      {/* On phones the tabs drop to a second row under the logo and sign out. */}
      <nav aria-label="Main" className="order-last flex w-full gap-6 text-sm font-medium sm:order-none sm:w-auto sm:self-stretch">
        <NavButton active={section === "new"} onClick={onNewDocument}>
          New document
        </NavButton>
        <NavButton active={section === "documents"} onClick={onShowDocuments}>
          My documents
        </NavButton>
      </nav>
      <div className="ml-auto flex items-center gap-4 py-3">
        <span className="hidden text-sm text-gray-text sm:inline">{email}</span>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-md border border-rule px-3 py-1.5 text-sm font-medium text-navy hover:border-brand-blue hover:text-brand-blue"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`border-b-2 pt-0.5 pb-2 sm:pb-0 ${active ? "border-accent text-navy" : "border-transparent text-gray-text hover:text-navy"}`}
    >
      {children}
    </button>
  );
}
