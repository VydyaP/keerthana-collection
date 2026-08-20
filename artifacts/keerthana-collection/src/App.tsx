import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleUserRound,
  Copy,
  FileAudio,
  FileText,
  Filter,
  Grid2X2,
  Heart,
  ListFilter,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import { Link, Route, Switch as WouterSwitch, useLocation, useParams, Router as WouterRouter } from "wouter";
import {
  allowedEmails,
  auth,
  firebaseConfigured,
  googleProvider,
  isAllowedUser,
  type FileSlot,
  type Keerthana,
  type Language,
} from "@/lib/firebase";
import { formatBytes, removeNotation, subscribeToKeerthanas, syncKeerthanas, uploadNotation } from "@/lib/firebase-store";

const queryClient = new QueryClient();
const SECURITY_CODE = import.meta.env.VITE_COLLECTION_SECURITY_CODE || "108";

const starterCollection: Keerthana[] = [
  {
    id: "k-001", name: "Vatapi Ganapatim", raga: "Hamsadhwani", tala: "Adi", composer: "Muthuswami Dikshitar", deity: "Ganesha",
    lyrics: "Vatapi ganapatim bhajeham\nVaaranaasyam varapradam\nBhootaadim jagatprabhum", translation: "I worship Vatapi Ganapati, elephant-faced giver of boons, the primal lord of the universe.",
    notationFiles: { Telugu: [], Tamil: [], English: [{ name: "vatapi-ganapatim-notation.pdf", url: "#", size: "218 KB", bytes: 223232, uploadedAt: "12 Feb 2024" }] },
  },
  {
    id: "k-002", name: "Nagumomu Ganaleni", raga: "Abheri", tala: "Adi", composer: "Tyagaraja", deity: "Rama",
    lyrics: "Nagumomu ganaleni naa jaali thelisi\nNannu brovagaradha Sri Raghuvara nee", translation: "O Raghuvara, knowing my sorrow at not seeing your smiling face, will you not protect me?",
    notationFiles: { Telugu: [{ name: "nagumomu-telugu.pdf", url: "#", size: "340 KB", bytes: 348160, uploadedAt: "04 Mar 2024" }], Tamil: [], English: [] },
  },
  {
    id: "k-003", name: "Bhaja Govindam", raga: "Mohanam", tala: "Rupakam", composer: "Adi Shankaracharya", deity: "Krishna",
    lyrics: "Bhaja govindam bhaja govindam\ngovindam bhaja moodhamate", translation: "Seek Govinda, seek Govinda, seek Govinda, O deluded mind.",
    notationFiles: { Telugu: [], Tamil: [], English: [{ name: "bhaja-govindam-score.pdf", url: "#", size: "186 KB", bytes: 190464, uploadedAt: "19 Jan 2024" }] },
  },
  {
    id: "k-004", name: "Kurai Ondrum Illai", raga: "Ragamalika", tala: "Adi", composer: "C. Rajagopalachari", deity: "Venkateswara",
    lyrics: "Kurai ondrum illai maraimoorthy kanna\nKurai ondrum illai kanna", translation: "I have no grievances, O mysterious Krishna. I have no wants, Krishna.",
    notationFiles: { Telugu: [], Tamil: [{ name: "kurai-ondrum-illai-tamil.pdf", url: "#", size: "492 KB", bytes: 503808, uploadedAt: "27 Apr 2024" }], English: [] },
  },
  {
    id: "k-005", name: "Nagendra Haraya", raga: "Shivaranjani", tala: "Misra Chapu", composer: "Traditional", deity: "Shiva",
    lyrics: "Nagendra haraya trilochanaya\nBhasmanga ragaya maheswaraya", translation: "Salutations to the great Lord, adorned with a serpent, three eyes, and sacred ash.",
    notationFiles: { Telugu: [], Tamil: [], English: [] },
  },
  {
    id: "k-006", name: "Kuzhaloothi Manamellam", raga: "Kambhoji", tala: "Adi", composer: "Koteeswara Iyer", deity: "Muruga",
    lyrics: "Kuzhaloothi manamellam kollai konda pinnum\nKuzhaloothi manamellam", translation: "After stealing every heart with the sound of his flute, he plays on.",
    notationFiles: { Telugu: [], Tamil: [], English: [{ name: "kuzhaloothi-english.txt", url: "#", size: "8 KB", bytes: 8192, uploadedAt: "02 May 2024" }] },
  },
  {
    id: "k-007", name: "Alaipayuthey Kanna", raga: "Kanada", tala: "Adi", composer: "Oothukkadu Venkata Kavi", deity: "Krishna",
    lyrics: "Alaipayuthey kanna en manam alaipayuthey\nAanandha mohana venu gaanam", translation: "My mind is restless, Krishna, carried away by the joyful, enchanting music of your flute.",
    notationFiles: { Telugu: [], Tamil: [{ name: "alaipayuthey-tamil.pdf", url: "#", size: "275 KB", bytes: 281600, uploadedAt: "11 Jun 2024" }], English: [] },
  },
  {
    id: "k-008", name: "Jagadodharana", raga: "Kapi", tala: "Adi", composer: "Purandara Dasa", deity: "Krishna",
    lyrics: "Jagadodharana aadisidale yashode\nJagadodharana maganendu", translation: "Yashoda played with the redeemer of the world, her little child.",
    notationFiles: { Telugu: [], Tamil: [], English: [{ name: "jagadodharana-score.pdf", url: "#", size: "301 KB", bytes: 308224, uploadedAt: "29 Jun 2024" }] },
  },
];

function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      if (nextUser && !isAllowedUser(nextUser.email)) {
        setError("This Google account is not in the trusted circle.");
        if (auth) void signOut(auth);
        setUser(null);
      } else {
        setError("");
        setUser(nextUser);
      }
      setLoading(false);
    });
  }, []);

  return { user, loading, error };
}

function useCollection(user: User | null) {
  const [items, setItemsState] = useState<Keerthana[]>(() => {
    if (firebaseConfigured) return [];
    try {
      const saved = localStorage.getItem("keerthana-collection");
      return saved ? JSON.parse(saved) : starterCollection;
    } catch { return starterCollection; }
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured || !user) return;
    setItemsState([]);
    setSyncing(true);
    return subscribeToKeerthanas(
      user.uid,
      (next) => {
        setItemsState(next);
        setSyncing(false);
      },
      () => setSyncing(false),
    );
  }, [user?.uid]);

  const setItems: Dispatch<SetStateAction<Keerthana[]>> = (update) => {
    setItemsState((previous) => {
      const next = typeof update === "function" ? update(previous) : update;
      if (firebaseConfigured && user) {
        setSyncing(true);
        void syncKeerthanas(user.uid, previous, next).finally(() => setSyncing(false));
      } else {
        localStorage.setItem("keerthana-collection", JSON.stringify(next));
      }
      return next;
    });
  };

  return { items, setItems, syncing };
}

function AppShell({ children, count }: { children: ReactNode; count: number }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = [
    { href: "/", label: "Collection", icon: Grid2X2 },
    { href: "/profile", label: "My space", icon: CircleUserRound },
  ];
  return (
    <div className="app-shell">
      <aside className="desktop-rail">
        <Link href="/" className="brand-lockup" data-testid="link-brand">
          <span className="brand-mark"><span /></span>
          <span><strong>keerthana</strong><em>collection</em></span>
        </Link>
        <div className="rail-rule" />
        <p className="rail-kicker">A private listening room</p>
        <nav className="rail-nav" aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`rail-link ${location === href ? "active" : ""}`} data-testid={`link-${label.toLowerCase().replace(" ", "-")}`}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{href === "/" && <small>{count}</small>}
            </Link>
          ))}
        </nav>
        <div className="rail-bottom">
          <div className="rail-note"><Sparkles size={15} /><span>Keep the thread<br />alive.</span></div>
          <p className="rail-meta">Private archive · v0.1</p>
        </div>
      </aside>
      <header className="mobile-header">
        <Link href="/" className="mobile-brand" data-testid="link-mobile-brand"><span className="brand-mark"><span /></span><strong>keerthana</strong></Link>
        <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} data-testid="button-mobile-menu" aria-label="Open menu"><Menu size={21} /></Button>
        {menuOpen && <div className="mobile-popover">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="mobile-pop-link" data-testid={`mobile-link-${label.toLowerCase().replace(" ", "-")}`}><Icon size={16} /> {label}</Link>)}</div>}
      </header>
      <main className="main-canvas">{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={location === href ? "active" : ""} data-testid={`bottom-link-${label.toLowerCase().replace(" ", "-")}`}><Icon size={19} /><span>{label}</span></Link>)}
      </nav>
    </div>
  );
}

function SecurityGate({ onUnlock, onCancel }: { onUnlock: () => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  function submit(e: FormEvent) { e.preventDefault(); if (code === SECURITY_CODE) onUnlock(); else setWrong(true); }
  return <div className="overlay" role="dialog" aria-modal="true">
    <form className="security-card" onSubmit={submit}>
      <div className="security-icon"><LockKeyhole size={18} /></div>
      <p className="eyebrow">Private collection</p>
      <h2>A small check-in.</h2>
      <p className="security-copy">Enter the archive code to add or edit a song. This keeps the room just for us.</p>
      <label className="field-label" htmlFor="security-code">Security code</label>
      <Input id="security-code" value={code} onChange={(e) => { setCode(e.target.value); setWrong(false); }} type="password" inputMode="numeric" autoFocus placeholder="•••" data-testid="input-security-code" />
      {wrong && <p className="field-error" data-testid="text-security-error">That code did not open the door.</p>}
      <div className="dialog-actions"><Button type="button" variant="ghost" onClick={onCancel} data-testid="button-security-cancel">Cancel</Button><Button type="submit" data-testid="button-security-unlock">Unlock <ArrowRight size={15} /></Button></div>
    </form>
  </div>;
}

function CollectionPage({ items, setItems, requestSecurity }: { items: Keerthana[]; setItems: Dispatch<SetStateAction<Keerthana[]>>; requestSecurity: (destination: string, onUnlock?: () => void) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [groupBy, setGroupBy] = useState("Raga");
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkField, setBulkField] = useState("raga");
  const [view, setView] = useState<"grid" | "list">("grid");
  const values = useMemo(() => ({ Raga: [...new Set(items.map(i => i.raga))], Deity: [...new Set(items.map(i => i.deity))], Composer: [...new Set(items.map(i => i.composer))] }), [items]);
  const filtered = useMemo(() => items.filter(item => {
    const haystack = [item.name, item.raga, item.tala, item.composer, item.deity].join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase()) && (filter === "All" || item[groupBy.toLowerCase() as "raga" | "deity" | "composer"] === filter);
  }), [items, search, filter, groupBy]);
  const groups = useMemo(() => filtered.reduce<Record<string, Keerthana[]>>((acc, item) => { const key = groupBy === "Raga" ? item.raga : groupBy === "Deity" ? item.deity : item.composer; (acc[key] ||= []).push(item); return acc; }, {}), [filtered, groupBy]);
  const allSelected = filtered.length > 0 && filtered.every(item => selected.includes(item.id));
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map(item => item.id));
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const deleteSelected = () => {
    if (selected.length && window.confirm(`Remove ${selected.length} ${selected.length === 1 ? "song" : "songs"} from the collection?`)) {
      requestSecurity("bulk-delete", () => {
        setItems(items => items.filter(item => !selected.includes(item.id)));
        setSelected([]);
      });
    }
  };
  const applyBulk = () => {
    if (!bulkValue.trim()) return;
    requestSecurity("bulk-reassign", () => {
      setItems(items => items.map(item => selected.includes(item.id) ? { ...item, [bulkField]: bulkValue.trim() } : item));
      setBulkMode(false);
      setBulkValue("");
    });
  };
  return <div className="page-wrap collection-page">
    <div className="page-header">
      <div><p className="eyebrow">The listening room <span className="live-dot" /></p><h1>Every song has<br /><i>a way in.</i></h1><p className="page-intro">A growing shelf of songs, ragas, and little moments of devotion.</p></div>
      <Button onClick={() => requestSecurity("/keerthanas/new")} className="add-button" data-testid="button-add-keerthana"><Plus size={17} /> <span>Add keerthana</span></Button>
    </div>
    <div className="collection-toolbar">
      <div className="search-wrap"><Search size={18} /><Input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search songs, ragas, people…" data-testid="input-search-collection" /></div>
      <div className="toolbar-actions">
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "toolbar-active" : ""} data-testid="button-toggle-filters"><Filter size={15} /> Filter {filter !== "All" && <span className="filter-count">1</span>}</Button>
        <div className="segmented"><button className={view === "grid" ? "selected" : ""} onClick={() => setView("grid")} aria-label="Grid view" data-testid="button-view-grid"><Grid2X2 size={16} /></button><button className={view === "list" ? "selected" : ""} onClick={() => setView("list")} aria-label="List view" data-testid="button-view-list"><ListFilter size={16} /></button></div>
      </div>
    </div>
    {showFilters && <div className="filter-panel">
      <div className="filter-panel-label"><SlidersHorizontal size={15} /> Refine this shelf</div>
      <div className="filter-pills">{["All", ...(values[groupBy as keyof typeof values] || [])].map(value => <button key={value} onClick={() => setFilter(value)} className={`filter-pill ${filter === value ? "active" : ""}`} data-testid={`button-filter-${value.toLowerCase().replaceAll(" ", "-")}`}>{value}<span>{value === "All" ? items.length : items.filter(i => i[groupBy.toLowerCase() as "raga" | "deity" | "composer"] === value).length}</span></button>)}</div>
    </div>}
    <div className="shelf-controls">
      <div className="selection-line"><button onClick={toggleAll} className={`check-box ${allSelected ? "checked" : ""}`} aria-label="Select all visible songs" data-testid="button-select-all">{allSelected && <Check size={13} />}</button><span>{selected.length ? `${selected.length} selected` : `${filtered.length} songs in the room`}</span></div>
      <div className="group-control"><span>Arrange by</span><select value={groupBy} onChange={e => { setGroupBy(e.target.value); setFilter("All"); }} data-testid="select-group-by"><option>Raga</option><option>Deity</option><option>Composer</option></select><ChevronDown size={14} /></div>
    </div>
    {selected.length > 0 && <div className="bulk-bar"><div><strong>{selected.length}</strong> marked for a little housekeeping</div><div className="bulk-actions"><Button variant="outline" onClick={() => setBulkMode(!bulkMode)} data-testid="button-bulk-reassign"><Pencil size={14} /> Reassign</Button><Button variant="ghost" className="danger-ghost" onClick={deleteSelected} data-testid="button-bulk-delete"><Trash2 size={14} /> Remove</Button><button className="clear-selection" onClick={() => setSelected([])} aria-label="Clear selection" data-testid="button-clear-selection"><X size={16} /></button></div></div>}
    {bulkMode && <div className="bulk-editor"><span>Set {bulkField} for marked songs</span><select value={bulkField} onChange={e => setBulkField(e.target.value)} data-testid="select-bulk-field"><option value="raga">Raga</option><option value="tala">Tala</option><option value="composer">Composer</option><option value="deity">Deity</option></select><Input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Type a new value…" data-testid="input-bulk-value" /><Button onClick={applyBulk} data-testid="button-apply-bulk">Apply</Button></div>}
    {filtered.length === 0 ? <EmptyCollection hasSearch={!!search} onClear={() => { setSearch(""); setFilter("All"); }} /> : <div className={`group-list ${view === "list" ? "list-view" : ""}`}>{Object.entries(groups).map(([group, songs]) => <section className="shelf-group" key={group}><div className="group-heading"><span className="group-index">{String(Object.keys(groups).indexOf(group) + 1).padStart(2, "0")}</span><h2>{group}</h2><span className="group-count">{songs.length} {songs.length === 1 ? "song" : "songs"}</span><div className="heading-line" /></div><div className="song-grid">{songs.map(song => <SongCard key={song.id} song={song} selected={selected.includes(song.id)} onToggle={() => toggle(song.id)} onEdit={() => requestSecurity(`/keerthanas/${song.id}/edit`)} />)}</div></section>)}</div>}
    <p className="collection-footer"><Heart size={13} fill="currentColor" /> Collected slowly, shared carefully <span>·</span> {items.length} total</p>
  </div>;
}

function SongCard({ song, selected, onToggle, onEdit }: { song: Keerthana; selected: boolean; onToggle: () => void; onEdit: () => void }) {
  const fileCount = Object.values(song.notationFiles).flat().length;
  return <article className={`song-card ${selected ? "is-selected" : ""}`} data-testid={`card-keerthana-${song.id}`}>
    <div className="card-topline"><button onClick={onToggle} className={`check-box ${selected ? "checked" : ""}`} aria-label={`Select ${song.name}`} data-testid={`button-select-${song.id}`}>{selected && <Check size={13} />}</button><span className="song-number">{song.id.replace("k-", "#")}</span><button className="icon-button" onClick={onEdit} aria-label={`Edit ${song.name}`} data-testid={`button-edit-${song.id}`}><MoreHorizontal size={18} /></button></div>
    <Link href={`/keerthanas/${song.id}`} className="song-card-link" data-testid={`link-keerthana-${song.id}`}>
      <div className="notation-glyph" aria-hidden="true"><span>Sa</span><i>ri</i><b>ga</b><em>ma</em></div>
      <h3 data-testid={`text-keerthana-name-${song.id}`}>{song.name}</h3>
      <p className="composer">{song.composer}</p>
      <div className="card-meta"><span>{song.tala}</span><span className="meta-dot" /><span>{fileCount ? `${fileCount} score${fileCount > 1 ? "s" : ""}` : "Lyrics only"}</span></div>
    </Link>
  </article>;
}

function EmptyCollection({ hasSearch, onClear }: { hasSearch: boolean; onClear: () => void }) {
  return <div className="empty-state"><div className="empty-orbit"><BookOpen size={22} /></div><h2>{hasSearch ? "Nothing on this frequency." : "The shelf is waiting."}</h2><p>{hasSearch ? "Try a different spelling, raga, or composer." : "Add the first song that keeps returning to you."}</p>{hasSearch && <Button variant="outline" onClick={onClear} data-testid="button-clear-search">Clear search</Button>}</div>;
}

function FormPage({ items, setItems, editId, user }: { items: Keerthana[]; setItems: Dispatch<SetStateAction<Keerthana[]>>; editId?: string; user: User | null }) {
  const [, navigate] = useLocation();
  const editing = !!editId;
  const existing = items.find(i => i.id === editId);
  const [draftId] = useState(() => editId ?? `k-${crypto.randomUUID()}`);
  const [name, setName] = useState(existing?.name || "");
  const [raga, setRaga] = useState(existing?.raga || "");
  const [tala, setTala] = useState(existing?.tala || "");
  const [composer, setComposer] = useState(existing?.composer || "");
  const [deity, setDeity] = useState(existing?.deity || "");
  const [lyrics, setLyrics] = useState(existing?.lyrics || "");
  const [translation, setTranslation] = useState(existing?.translation || "");
  const [saved, setSaved] = useState(false);
  const [files, setFiles] = useState(existing?.notationFiles || { Telugu: [], Tamil: [], English: [] });
  const [uploading, setUploading] = useState<Language | null>(null);
  const values = { raga: [...new Set(items.map(i => i.raga))], tala: [...new Set(items.map(i => i.tala))], composer: [...new Set(items.map(i => i.composer))], deity: [...new Set(items.map(i => i.deity))] };
  const handleFile = async (language: Language, file: File) => {
    setUploading(language);
    try {
      const uploaded = firebaseConfigured && user
        ? await uploadNotation(user.uid, draftId, language, file)
        : { name: file.name, url: URL.createObjectURL(file), size: formatBytes(file.size), bytes: file.size, uploadedAt: "Just now" };
      setFiles(prev => ({ ...prev, [language]: [...prev[language], uploaded] }));
    } finally {
      setUploading(null);
    }
  };
  const removeFile = async (language: Language, file: FileSlot) => {
    if (firebaseConfigured && user && file.storagePath) await removeNotation(file.storagePath);
    setFiles(prev => ({ ...prev, [language]: prev[language].filter(item => item !== file) }));
  };
  const save = (e: FormEvent) => {
    e.preventDefault(); if (!name.trim() || !raga.trim() || !composer.trim()) return;
    if (editing && existing) setItems(all => all.map(item => item.id === editId ? { ...item, name: name.trim(), raga, tala, composer, deity, lyrics, translation, notationFiles: files } : item));
    else setItems(all => [{ id: draftId, name: name.trim(), raga, tala, composer, deity, lyrics, translation, notationFiles: files }, ...all]);
    setSaved(true); setTimeout(() => navigate(editing ? `/keerthanas/${editId}` : "/"), 450);
  };
  if (editing && !existing) return <div className="page-wrap"><EmptyCollection hasSearch={false} onClear={() => navigate("/")} /></div>;
  return <div className="page-wrap form-page">
    <div className="subpage-top"><Link href="/" className="back-link" data-testid="link-back-collection"><ArrowLeft size={16} /> Collection</Link><span className="security-label"><LockKeyhole size={13} /> Private edit mode</span></div>
    <div className="form-heading"><p className="eyebrow">{editing ? "Refine a song" : "Add to the room"}</p><h1>{editing ? "Make it more<br /><i>like yours.</i>" : "Give a song<br /><i>a place to stay.</i>"}</h1><p>{editing ? "Adjust the details without losing the feeling." : "A name, a few words, and whatever helps you find it again."}</p></div>
    <form className="keerthana-form" onSubmit={save}>
      <section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Identity</h2><p>The small coordinates of the song.</p></div></div><div className="field-grid"><Field label="Song name" required value={name} onChange={setName} placeholder="e.g. Endaro Mahanubhavulu" testId="input-song-name" /><Field label="Raga" required value={raga} onChange={setRaga} placeholder="e.g. Sri" options={values.raga} testId="input-raga" /><Field label="Tala" value={tala} onChange={setTala} placeholder="e.g. Adi" options={values.tala} testId="input-tala" /><Field label="Composer" required value={composer} onChange={setComposer} placeholder="e.g. Tyagaraja" options={values.composer} testId="input-composer" /><Field label="Deity / subject" value={deity} onChange={setDeity} placeholder="e.g. Rama" options={values.deity} testId="input-deity" /></div></section>
      <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Words</h2><p>Keep the original close to its meaning.</p></div></div><div className="words-grid"><div className="word-field"><label className="field-label">Lyrics</label><Textarea value={lyrics} onChange={e => setLyrics(e.target.value)} placeholder="Enter the lyrics, one line at a time…" rows={8} data-testid="textarea-lyrics" /><span className="field-hint">Line breaks are kept exactly as entered.</span></div><div className="word-field"><label className="field-label">Translation <span className="optional">optional</span></label><Textarea value={translation} onChange={e => setTranslation(e.target.value)} placeholder="A translation for the next listener…" rows={8} data-testid="textarea-translation" /></div></div></section>
      <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Notation</h2><p>Attach scores in the script your friends read.</p></div></div><div className="file-slots">{(["Telugu", "Tamil", "English"] as const).map(language => <div className="file-slot" key={language}><div><span className="file-language">{language}</span><span className="file-count">{files[language].length ? `${files[language].length} file${files[language].length > 1 ? "s" : ""}` : "No files yet"}</span></div><label className="upload-trigger"><Upload size={15} /> {uploading === language ? "Uploading…" : "Add file"}<input type="file" accept=".pdf,.epub,.txt,.png,.jpg,.jpeg" disabled={uploading === language} onChange={e => { const file = e.target.files?.[0]; if (file) void handleFile(language, file); e.currentTarget.value = ""; }} data-testid={`input-upload-${language.toLowerCase()}`} /></label>{files[language].map(file => <div className="file-row" key={`${file.name}-${file.uploadedAt}`}><FileText size={15} /><span>{file.name}</span><button type="button" onClick={() => void removeFile(language, file)} data-testid={`button-remove-file-${language.toLowerCase()}-${file.name.replaceAll(/[^a-z0-9]/gi, "-")}`}><X size={14} /></button></div>)}</div>)}</div></section>
      <div className="form-footer"><Button type="button" variant="ghost" onClick={() => navigate(editing && editId ? `/keerthanas/${editId}` : "/")} data-testid="button-cancel-form">Cancel</Button><Button type="submit" disabled={saved} data-testid="button-save-keerthana">{saved ? <><Check size={16} /> Saved</> : <>{editing ? "Save changes" : "Add to collection"} <ArrowRight size={16} /></>}</Button></div>
    </form>
  </div>;
}

function Field({ label, value, onChange, placeholder, options, required, testId }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; options?: string[]; required?: boolean; testId: string }) {
  const listId = `${testId}-options`;
  return <div className="field"><label className="field-label" htmlFor={testId}>{label} {required && <span className="required">*</span>}</label><Input id={testId} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} list={options ? listId : undefined} data-testid={testId} />{options && <datalist id={listId}>{options.map(option => <option key={option} value={option} />)}</datalist>}</div>;
}

function DetailPage({ items, requestSecurity }: { items: Keerthana[]; requestSecurity: (destination: string) => void }) {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const song = items.find(item => item.id === id);
  const [copied, setCopied] = useState(false);
  if (!song) return <div className="page-wrap"><EmptyCollection hasSearch={false} onClear={() => navigate("/")} /></div>;
  const files = Object.entries(song.notationFiles).flatMap(([language, list]) => list.map(file => ({ ...file, language })));
  const copyLyrics = async () => { await navigator.clipboard?.writeText(`${song.name}\n\n${song.lyrics}`); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  return <div className="page-wrap detail-page">
    <div className="subpage-top"><Link href="/" className="back-link" data-testid="link-back-collection-detail"><ArrowLeft size={16} /> Collection</Link><div className="detail-actions"><Button variant="ghost" size="sm" onClick={copyLyrics} data-testid="button-copy-lyrics">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy lyrics"}</Button><Button variant="outline" size="sm" onClick={() => requestSecurity(`/keerthanas/${song.id}/edit`)} data-testid="button-edit-detail"><Pencil size={15} /> Edit</Button><Button variant="ghost" size="icon" aria-label="Share song" onClick={() => navigator.share?.({ title: song.name, text: song.composer })} data-testid="button-share-detail"><Share2 size={16} /></Button></div></div>
    <div className="detail-hero"><div className="detail-glyph"><span>Sa</span><i>ri</i><b>ga</b><em>ma</em><strong>pa</strong></div><div><p className="eyebrow">{song.deity} · {song.raga}</p><h1 data-testid={`text-detail-name-${song.id}`}>{song.name}</h1><p className="detail-composer">by <strong>{song.composer}</strong></p><div className="detail-tags"><Badge>{song.tala}</Badge><Badge variant="outline">{song.deity}</Badge><span className="detail-id">{song.id.replace("k-", "KEERTHANA / ")}</span></div></div></div>
    <div className="detail-layout"><article className="lyrics-column"><div className="content-label"><span>01 / Original</span><button onClick={copyLyrics} data-testid="button-copy-lyrics-inline">{copied ? "Copied to clipboard" : "Copy text"} <Copy size={13} /></button></div><div className="lyrics-block" data-testid={`text-lyrics-${song.id}`}>{song.lyrics.split("\n").map((line, index) => <p key={index}>{line}</p>)}</div><div className="translation-block"><div className="content-label"><span>02 / Meaning</span></div><p data-testid={`text-translation-${song.id}`}>{song.translation || "A translation has not been added yet."}</p></div></article><aside className="notation-column"><div className="content-label"><span>Notation files</span><span>{files.length}</span></div>{files.length ? <div className="notation-list">{files.map(file => <a className="notation-file" href={file.url} key={`${file.language}-${file.name}`} data-testid={`link-notation-${file.language.toLowerCase()}`}><span className="file-icon">{file.name.endsWith(".pdf") ? <FileText size={16} /> : <FileAudio size={16} />}</span><span className="notation-file-copy"><strong>{file.name}</strong><small>{file.language} · {file.size}</small></span><ArrowRight size={15} /></a>)}</div> : <div className="notation-empty"><FileText size={20} /><p>No notation files yet.</p><span>Add a score when you have one handy.</span></div>}<div className="detail-note"><Sparkles size={15} /><p>This room is shared with a small circle of trusted listeners.</p></div></aside></div>
  </div>;
}

function initialsFor(user: User | null) {
  return (user?.displayName || "KS").split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function ProfilePage({ items, user }: { items: Keerthana[]; user: User | null }) {
  const [dark, setDark] = useState(() => localStorage.getItem("keerthana-dark") === "true");
  const [, navigate] = useLocation();
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("keerthana-dark", String(dark)); }, [dark]);
  const [signedOut, setSignedOut] = useState(false);
  if (signedOut) return <div className="page-wrap signout-page"><div className="signout-mark"><LockKeyhole size={21} /></div><p className="eyebrow">See you soon</p><h1>The room is<br /><i>quiet now.</i></h1><p>Your collection is safe here. Come back whenever a song calls.</p><Button onClick={() => setSignedOut(false)} data-testid="button-return-profile">Return to collection <ArrowRight size={16} /></Button></div>;
  const notationBytes = items.flatMap(item => Object.values(item.notationFiles).flat()).reduce((sum, file) => sum + (file.bytes || 0), 0);
  const lyricBytes = items.reduce((sum, item) => sum + new TextEncoder().encode(`${item.lyrics}${item.translation}`).length, 0);
  const usedBytes = notationBytes + lyricBytes;
  const budgetBytes = 5 * 1024 * 1024 * 1024;
  const usedPercent = Math.min(100, (usedBytes / budgetBytes) * 100);
  const displayName = user?.displayName || "Preview listener";
  const email = user?.email || "Firebase is not connected yet";
  const logout = () => {
    if (firebaseConfigured && auth) void signOut(auth);
    else setSignedOut(true);
  };
  return <div className="page-wrap profile-page"><div className="profile-top"><div><p className="eyebrow">Your space</p><h1>Keerthana<br /><i>keeper.</i></h1></div><div className="profile-avatar">{initialsFor(user)}</div></div><p className="profile-intro">This is your corner of the archive — a place for the songs you come back to, and the people you trust with them.</p><section className="profile-card identity-card"><div className="identity-symbol">{initialsFor(user)}</div><div><p className="card-eyebrow">Signed in as</p><h2 data-testid="text-profile-name">{displayName}</h2><p data-testid="text-profile-email">{email}</p></div><Badge variant="outline">{firebaseConfigured ? "Trusted" : "Preview"}</Badge></section><section className="settings-section"><div className="settings-heading"><span>Settings</span><p>Make the room feel right.</p></div><div className="setting-row"><div className="setting-icon"><Moon size={17} /></div><div><strong>Night listening</strong><p>Dim the shelf for evening practice.</p></div><Switch checked={dark} onCheckedChange={setDark} data-testid="switch-dark-mode" /></div><div className="setting-row"><div className="setting-icon"><Share2 size={17} /></div><div><strong>Trusted circle</strong><p>{allowedEmails.length ? `${allowedEmails.length} Google account${allowedEmails.length === 1 ? "" : "s"} can enter this collection.` : "Anyone you invite to the Firebase project can enter."}</p></div><button className="setting-arrow" data-testid="button-manage-circle"><ArrowRight size={16} /></button></div></section><section className="storage-card"><div className="storage-heading"><div><span className="card-eyebrow">Archive storage</span><h2>{formatBytes(usedBytes)} <span>of 5 GB</span></h2></div><FileText size={23} /></div><div className="storage-bar"><span style={{ width: `${Math.max(usedPercent, usedBytes ? 1 : 0)}%` }} /></div><div className="storage-breakdown"><span><i className="dot dot-score" />Notation <strong>{formatBytes(notationBytes)}</strong></span><span><i className="dot dot-lyrics" />Words <strong>{formatBytes(lyricBytes)}</strong></span></div></section><div className="profile-footer"><span>Usage calculated from this collection</span><Button variant="ghost" className="logout-button" onClick={logout} data-testid="button-logout"><LogOut size={15} /> Log out</Button></div></div>;
}

function AuthPage({ error }: { error: string }) {
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    if (!auth || !googleProvider) return;
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setBusy(false);
    }
  };
  return <div className="auth-page"><div className="auth-mark"><span /></div><p className="eyebrow">A private listening room</p><h1>Come in,<br /><i>carefully.</i></h1><p className="auth-copy">Keerthana Collection is a small archive for the songs you return to. Sign in with the Google account included in your trusted circle.</p>{error && <p className="auth-error" data-testid="text-auth-error">{error}</p>}<Button onClick={() => void signIn()} disabled={busy} className="auth-button" data-testid="button-google-sign-in"><CircleUserRound size={17} /> {busy ? "Opening Google…" : "Continue with Google"} <ArrowRight size={16} /></Button><p className="auth-footnote">No public signup · your songs stay in your Firebase project</p></div>;
}

function Router() {
  const session = useSession();
  const { items, setItems } = useCollection(session.user);
  const [gate, setGate] = useState<{ destination: string; onUnlock?: () => void } | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const requestSecurity = (destination: string, onUnlock?: () => void) => setGate({ destination, onUnlock });
  useEffect(() => {
    const protectedRoute = location === "/keerthanas/new" || /^\/keerthanas\/[^/]+\/edit$/.test(location);
    if (protectedRoute && !unlocked) setGate({ destination: location });
  }, [location, unlocked]);
  const cancelGate = () => {
    setGate(null);
    if (location.startsWith("/keerthanas/")) navigate("/");
  };
  if (firebaseConfigured && session.loading) return <div className="auth-page auth-loading"><div className="auth-mark"><span /></div><p className="eyebrow">Opening the listening room</p><h1>One moment.</h1></div>;
  if (firebaseConfigured && !session.user) return <AuthPage error={session.error} />;
  return <AppShell count={items.length}><ErrorBoundary resetKey={location}><WouterSwitch>
    <Route path="/" component={() => <CollectionPage items={items} setItems={setItems} requestSecurity={requestSecurity} />} />
    <Route path="/keerthanas/new" component={() => <FormPage items={items} setItems={setItems} user={session.user} />} />
    <Route path="/keerthanas/:id/edit" component={() => { const { id } = useParams<{ id: string }>(); return <FormPage items={items} setItems={setItems} editId={id} user={session.user} />; }} />
    <Route path="/keerthanas/:id" component={() => <DetailPage items={items} requestSecurity={requestSecurity} />} />
    <Route path="/profile" component={() => <ProfilePage items={items} user={session.user} />} />
    <Route component={NotFound} />
  </WouterSwitch></ErrorBoundary>{gate && <SecurityGate onCancel={cancelGate} onUnlock={() => { const request = gate; setUnlocked(true); setGate(null); if (request.onUnlock) request.onUnlock(); else navigate(request.destination); }} />}</AppShell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;