"use client";
import { useState, useEffect } from "react";
import { supabase } from '../supabase';
/* ═══════════════════════════════════════════════════════════════
   AETERNA CONCEPT STORE — Premium Bible Web App
   ═══════════════════════════════════════════════════════════════
   Architecture:
   - Single React SPA with internal routing (state-based)
   - Persistent storage via Supabase (admins, products, reviews, images)
   - Role-based auth: SuperAdmin + Admin
   - WhatsApp lead qualification with product context
   - Premium luxury UI: warm cream, gold accents, serif typography
   ═══════════════════════════════════════════════════════════════ */

// ─── Constants ───────────────────────────────────────────────
const WHATSAPP_NUMBER = "573223778543"; // Replace with real number
const BRAND = "AETERNA";
const TAGLINE = "Lo que es para siempre, merece ser hermoso";
const CITY = "Medellín";

// Default SuperAdmin credentials (first run only)
const DEFAULT_SUPERADMIN = {
  username: "jeanpaul",
  password: "Aeterna2024!",
  role: "superadmin",
  name: "Jean Paul",
};

// ─── Seed Products (loaded on first run) ─────────────────────
const SEED_PRODUCTS = [
  {
    id: "p001",
    number: "001",
    name: "Génesis Imperial",
    price: 890000,
    description:
      "Biblia Reina-Valera 1960 en cuero italiano genuino con grabado en oro de 24k. Páginas con bordes dorados y caja de presentación en terciopelo.",
    image: null,
    stock: true,
    rating: 4.9,
    reviewCount: 47,
    category: "imperial",
  },
  {
    id: "p002",
    number: "002",
    name: "Éxodo Noir",
    price: 720000,
    description:
      "Edición limitada en cuero negro mate con tipografía plata. Incluye marcador de seda y estuche rígido personalizado.",
    image: null,
    stock: true,
    rating: 4.8,
    reviewCount: 32,
    category: "noir",
  },
  {
    id: "p003",
    number: "003",
    name: "Salmos Perla",
    price: 650000,
    description:
      "Cubierta en cuero blanco nacarado con detalles en oro rosé. Ideal para ceremonias y regalos de bautizo premium.",
    image: null,
    stock: true,
    rating: 5.0,
    reviewCount: 28,
    category: "ceremonial",
  },
  {
    id: "p004",
    number: "004",
    name: "Proverbios Heritage",
    price: 1200000,
    description:
      "Nuestra pieza insignia. Cuero envejecido artesanalmente, herrajes en bronce antiguo y nombre grabado a mano. Producción limitada a 50 unidades al año.",
    image: null,
    stock: false,
    rating: 5.0,
    reviewCount: 15,
    category: "heritage",
  },
  {
    id: "p005",
    number: "005",
    name: "Apocalipsis Royal",
    price: 980000,
    description:
      "Cuero burdeos con relieves florales debossed. Cierre magnético oculto y páginas de papel biblia ultra-fino importado de Japón.",
    image: null,
    stock: true,
    rating: 4.7,
    reviewCount: 21,
    category: "imperial",
  },
  {
    id: "p006",
    number: "006",
    name: "Isaías Devotional",
    price: 450000,
    description:
      "Formato compacto en cuero vegano premium. Perfecta para uso diario con cinta marcadora doble y notas al margen ampliadas.",
    image: null,
    stock: true,
    rating: 4.6,
    reviewCount: 54,
    category: "devotional",
  },
];

const SEED_REVIEWS = [
  {
    id: "r001",
    productId: "p001",
    author: "María Alejandra",
    stars: 5,
    text: "La calidad es impresionante. Mi familia quedó sin palabras al verla. Vale cada peso.",
    date: "2025-11-15",
  },
  {
    id: "r002",
    productId: "p001",
    author: "Carlos Restrepo",
    stars: 5,
    text: "La regalé a mi madre y lloró de la emoción. El empaque es una experiencia en sí misma.",
    date: "2025-10-22",
  },
  {
    id: "r003",
    productId: "p003",
    author: "Valentina Ospina",
    stars: 5,
    text: "Perfecta para el bautizo de mi hija. Todos preguntaron dónde la conseguí.",
    date: "2025-12-01",
  },
  {
    id: "r004",
    productId: "p002",
    author: "Diego Montoya",
    stars: 5,
    text: "El negro mate es elegantísimo. Parece una pieza de arte más que un libro.",
    date: "2025-09-18",
  },
  {
    id: "r005",
    productId: "p005",
    author: "Ana Lucía Henao",
    stars: 5,
    text: "El papel japonés se siente increíble al tacto. No puedo dejar de usarla cada mañana.",
    date: "2026-01-10",
  },
];

// ─── Utility Functions ───────────────────────────────────────
const formatCOP = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const buildWhatsAppUrl = (productNumber, productName) => {
  const msg = encodeURIComponent(
    `Hola AETERNA, me interesa la pieza #${productNumber} (${productName}). ¿Está disponible para entrega inmediata en ${CITY}?`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
};

const simpleHash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return "h" + Math.abs(h).toString(36);
};

// ─── (useStorage removido - todo usa Supabase ahora) ──────────

// ─── Auth Hook ───────────────────────────────────────────────
// Tabla Supabase: admins → columnas: username, password, role
// Todo se lee y escribe directamente en Supabase. Nada local.

function useAuth() {
  const [users, setUsers] = useState({});
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── CARGA INICIAL: traer todos los usuarios de Supabase ──
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*');

      if (error) {
        throw error;
      }

      const usersMap = {};
      if (data && data.length > 0) {
        data.forEach((row) => {
          usersMap[row.username.toLowerCase()] = {
            username: row.username.toLowerCase(),
            password: row.password,
            role: row.role || 'admin',
            supabaseId: row.id,
          };
        });
      }

      // Si la tabla está vacía, crear el SuperAdmin por defecto
      if (Object.keys(usersMap).length === 0) {
        const hashedPw = simpleHash(DEFAULT_SUPERADMIN.password);
        const { error: insertErr } = await supabase
          .from('admins')
          .insert([{
            username: DEFAULT_SUPERADMIN.username,
            password: hashedPw,
            role: 'superadmin',
          }]);

        if (!insertErr) {
          usersMap[DEFAULT_SUPERADMIN.username] = {
            username: DEFAULT_SUPERADMIN.username,
            password: hashedPw,
            role: 'superadmin',
          };
        }
      }

      setUsers(usersMap);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── LOGIN: SELECT directo a Supabase por username ──
  const login = async (username, password) => {
    const cleanUsername = username.toLowerCase().trim();
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', cleanUsername)
        .single();

      if (error || !data) {
        return { ok: false, msg: "Usuario no encontrado" };
      }

      // Comparar hash de la contraseña
      if (data.password !== simpleHash(password)) {
        return { ok: false, msg: "Contraseña incorrecta" };
      }

      // Sesión exitosa
      setSession({
        username: data.username,
        role: data.role || 'admin',
        name: data.username,
        supabaseId: data.id,
      });
      return { ok: true };
    } catch (err) {
      console.error("Error en login:", err);
      return { ok: false, msg: "Error de conexión" };
    }
  };

  const logout = () => setSession(null);

  // ── AGREGAR USUARIO: INSERT en Supabase con columnas username, password, role ──
  const addUser = async (username, password, role, name) => {
    const cleanUsername = username.toLowerCase().trim();

    if (!cleanUsername || !password) {
      return { ok: false, msg: "Campos vacíos" };
    }

    if (users[cleanUsername]) {
      return { ok: false, msg: "El usuario ya existe" };
    }

    try {
      const hashedPw = simpleHash(password);

      const { data, error } = await supabase
        .from('admins')
        .insert([{
          username: cleanUsername,
          password: hashedPw,
          role: role,
        }])
        .select();

      if (error) throw error;

      // Actualizar lista local para que la UI se actualice al instante
      setUsers((prev) => ({
        ...prev,
        [cleanUsername]: {
          username: cleanUsername,
          password: hashedPw,
          role: role,
          supabaseId: data?.[0]?.id || null,
        },
      }));

      return { ok: true };
    } catch (err) {
      console.error("Error al crear usuario:", err);
      return { ok: false, msg: "Error al guardar: " + err.message };
    }
  };

  // ── ELIMINAR USUARIO: DELETE en Supabase ──
  const removeUser = async (username) => {
    const cleanUsername = username.toLowerCase().trim();
    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('username', cleanUsername);

      if (error) throw error;

      setUsers((prev) => {
        const { [cleanUsername]: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  return {
    session,
    users,
    login,
    logout,
    addUser,
    removeUser,
    loading,
  };
}

// ─── SVG Components ──────────────────────────────────────────

/** AETERNA Isotipo: "A" entrelazada con infinito */
const AeternaLogo = ({ size = 48, color = "#B8963E" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D4AF37" />
        <stop offset="50%" stopColor={color} />
        <stop offset="100%" stopColor="#C5A028" />
      </linearGradient>
    </defs>
    {/* Infinity symbol */}
    <path
      d="M25 55 C25 45, 35 38, 50 50 C65 62, 75 55, 75 45 C75 35, 65 28, 50 40 C35 52, 25 45, 25 55Z"
      stroke="url(#goldGrad)"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Letter A */}
    <path
      d="M50 18 L33 72 M50 18 L67 72 M39 55 L61 55"
      stroke="url(#goldGrad)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Decorative serifs */}
    <line
      x1="29"
      y1="72"
      x2="37"
      y2="72"
      stroke="url(#goldGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <line
      x1="63"
      y1="72"
      x2="71"
      y2="72"
      stroke="url(#goldGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/** Star rating component */
const Stars = ({ rating, size = 16, interactive = false, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={
            i <= (interactive ? hover || rating : Math.round(rating))
              ? "#B8963E"
              : "#E0D5C1"
          }
          style={{ cursor: interactive ? "pointer" : "default", transition: "fill 0.2s" }}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(i)}
        >
          <path d="M10 1l2.47 5.56L18.5 7.3l-4.25 3.82L15.44 17 10 13.97 4.56 17l1.19-5.88L1.5 7.3l6.03-.74z" />
        </svg>
      ))}
    </span>
  );
};

/** WhatsApp icon */
const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ─── Page Components ─────────────────────────────────────────

/** Elegant divider */
const Divider = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      margin: "40px auto",
      maxWidth: 200,
    }}
  >
    <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #B8963E)" }} />
    <div
      style={{
        width: 6,
        height: 6,
        background: "#B8963E",
        transform: "rotate(45deg)",
      }}
    />
    <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #B8963E)" }} />
  </div>
);

/** Product card for the catalog grid */
const ProductCard = ({ product, onClick }) => {
  const [imgHover, setImgHover] = useState(false);

  // Generate a luxurious placeholder pattern based on product category
  const categoryColors = {
    imperial: ["#B8963E", "#8B7355"],
    noir: ["#2C2C2C", "#4A4A4A"],
    ceremonial: ["#D4C5A9", "#B8963E"],
    heritage: ["#6B4226", "#8B6F47"],
    devotional: ["#7B6B5E", "#A69279"],
  };
  const [c1, c2] = categoryColors[product.category] || ["#B8963E", "#8B7355"];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setImgHover(true)}
      onMouseLeave={() => setImgHover(false)}
      style={{
        cursor: "pointer",
        background: "#FFFDF8",
        border: "1px solid #E8E0D0",
        transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        transform: imgHover ? "translateY(-4px)" : "translateY(0)",
        boxShadow: imgHover
          ? "0 20px 40px rgba(139,115,85,0.15)"
          : "0 2px 8px rgba(139,115,85,0.06)",
      }}
    >
      {/* Product image placeholder */}
      <div
        className="card-image"
        style={{
          position: "relative",
          paddingBottom: "120%",
          background: `linear-gradient(145deg, ${c1}22, ${c2}33)`,
          overflow: "hidden",
        }}
      >
        {/* Debossed logo overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.2,
          }}
        >
          <AeternaLogo size={80} color={c1} />
        </div>
        {/* Product number badge */}
        <div
          className="card-badge"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(255,253,248,0.92)",
            backdropFilter: "blur(8px)",
            padding: "4px 10px",
            fontSize: 11,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            color: "#B8963E",
            letterSpacing: 1.5,
            zIndex: 3,
          }}
        >
          #{product.number}
        </div>
        {/* Product image */}
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
            }}
          />
        )}
        {/* Out of stock overlay */}
        {!product.stock && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,253,248,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 4,
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#8B7355",
                letterSpacing: 3,
                textTransform: "uppercase",
                background: "rgba(255,253,248,0.9)",
                padding: "8px 20px",
                border: "1px solid #B8963E",
              }}
            >
              Agotado
            </span>
          </div>
        )}
      </div>
      {/* Card info */}
      <div className="card-info" style={{ padding: "20px 16px" }}>
        <div
          className="card-title"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 18,
            fontWeight: 600,
            color: "#2C2420",
            marginBottom: 6,
            lineHeight: 1.3,
          }}
        >
          {product.name}
        </div>
        <div className="card-stars" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Stars rating={product.rating} size={13} />
          <span
            style={{
              fontSize: 11,
              color: "#8B7355",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ({product.reviewCount})
          </span>
        </div>
        <div
          className="card-price"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            fontWeight: 500,
            color: "#B8963E",
            letterSpacing: 0.5,
          }}
        >
          {formatCOP(product.price)}
        </div>
      </div>
    </div>
  );
};

/** Waitlist form for out-of-stock items */
const WaitlistForm = ({ product }) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div
        style={{
          padding: 20,
          background: "#F5F0E6",
          textAlign: "center",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 16,
          color: "#5A4A3A",
        }}
      >
        Te notificaremos cuando la pieza #{product.number} esté disponible.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 15,
          color: "#5A4A3A",
          fontStyle: "italic",
        }}
      >
        Esta pieza está agotada. Únete a la lista de espera:
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "1px solid #D4C5A9",
            background: "#FFFDF8",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: "#2C2420",
            outline: "none",
          }}
        />
        <button
          onClick={() => email.includes("@") && setSubmitted(true)}
          style={{
            padding: "12px 24px",
            background: "#2C2420",
            color: "#F5F0E6",
            border: "none",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1.5,
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          Notificarme
        </button>
      </div>
    </div>
  );
};

// ─── Main App ────────────────────────────────────────────────
export default function AeternaApp() {
  // ── State ──
  const [page, setPage] = useState("home"); // home | catalog | product | login | admin
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [prodLoading, setProdLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [revLoading, setRevLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const auth = useAuth();

  // ── Cargar productos desde Supabase al montar ──
  useEffect(() => {
    loadProducts();
    loadReviews();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error cargando productos:", err);
    } finally {
      setProdLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*');

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error("Error cargando reseñas:", err);
    } finally {
      setRevLoading(false);
    }
  };

  // Admin form states
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [adminTab, setAdminTab] = useState("products"); // products | users | settings
  const [editingProduct, setEditingProduct] = useState(null);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "admin",
  });

  // Review form
  const [reviewForm, setReviewForm] = useState({ author: "", stars: 5, text: "" });
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, selectedProduct]);

  const isLoading = prodLoading || revLoading || auth.loading;

  // Navigate helper
  const nav = (p, prod = null) => {
    setPage(p);
    setSelectedProduct(prod);
    setMenuOpen(false);
  };

  // ── Image Upload State ──
  const [uploading, setUploading] = useState(false);

  // ── Subir imagen a Supabase Storage ──
  const uploadImage = async (file) => {
    if (!file) return null;

    setUploading(true);
    try {
      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) throw error;

      // Obtener la URL pública
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Error subiendo imagen:", err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ── Product CRUD (Supabase) ──
  const saveProduct = async (product) => {
    try {
      // Verificar si el producto ya existe
      const exists = products.find((p) => p.id === product.id);

      if (exists) {
        // UPDATE en Supabase
        const { error } = await supabase
          .from('products')
          .update({
            number: product.number,
            name: product.name,
            price: product.price,
            description: product.description,
            image: product.image,
            stock: product.stock,
            rating: product.rating,
            reviewCount: product.reviewCount,
            category: product.category,
          })
          .eq('id', product.id);

        if (error) throw error;

        setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      } else {
        // INSERT en Supabase
        const { data, error } = await supabase
          .from('products')
          .insert([product])
          .select();

        if (error) throw error;

        setProducts((prev) => [...prev, data?.[0] || product]);
      }
    } catch (err) {
      console.error("Error guardando producto:", err);
    }
    setEditingProduct(null);
  };

  const deleteProduct = async (id) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error eliminando producto:", err);
    }
  };

  const toggleStock = async (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const newStock = !product.stock;
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
      );
    } catch (err) {
      console.error("Error cambiando stock:", err);
    }
  };

  // ── Review submit (Supabase) ──
  const submitReview = async () => {
    if (!reviewForm.author || !reviewForm.text) return;
    const newReview = {
      id: generateId(),
      productId: selectedProduct.id,
      author: reviewForm.author,
      stars: reviewForm.stars,
      text: reviewForm.text,
      date: new Date().toISOString().split("T")[0],
    };

    try {
      // Insertar reseña en Supabase
      const { error: revError } = await supabase
        .from('reviews')
        .insert([newReview]);

      if (revError) throw revError;

      // Actualizar estado local
      const updatedReviews = [...reviews, newReview];
      setReviews(updatedReviews);

      // Calcular nuevo rating
      const prodReviews = updatedReviews.filter((r) => r.productId === selectedProduct.id);
      const avgRating = prodReviews.reduce((a, b) => a + b.stars, 0) / prodReviews.length;
      const newRating = Math.round(avgRating * 10) / 10;
      const newCount = prodReviews.length;

      // Actualizar rating del producto en Supabase
      await supabase
        .from('products')
        .update({ rating: newRating, reviewCount: newCount })
        .eq('id', selectedProduct.id);

      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, rating: newRating, reviewCount: newCount }
            : p
        )
      );
    } catch (err) {
      console.error("Error guardando reseña:", err);
    }

    setReviewForm({ author: "", stars: 5, text: "" });
    setShowReviewForm(false);
  };

  // ── Login handler ──
  // Valida credenciales directamente contra la tabla 'admins' en Supabase
  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      setLoginError("Ingresa usuario y contraseña");
      return;
    }

    const result = await auth.login(loginForm.username, loginForm.password);
    if (result.ok) {
      setLoginError("");
      setLoginForm({ username: "", password: "" });
      nav("admin");
    } else {
      setLoginError(result.msg);
    }
  };

  // ── Styles object ──
  const s = {
    page: {
      minHeight: "100vh",
      background: "#FAF6EE",
      fontFamily: "'DM Sans', sans-serif",
      color: "#2C2420",
      position: "relative",
      overflowX: "hidden",
      width: "100%",
    },
    // Texture overlay
    texture: {
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      zIndex: 0,
      opacity: 0.03,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
    },
    content: { position: "relative", zIndex: 1 },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 12px",
      borderBottom: "1px solid #E8E0D0",
      background: "rgba(250,246,238,0.95)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      gap: 4,
    },
    serif: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    },
    gold: { color: "#B8963E" },
    muted: { color: "#8B7355" },
    container: { maxWidth: 1200, margin: "0 auto", padding: "0 24px" },
    btn: {
      padding: "14px 32px",
      border: "none",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: 2,
      textTransform: "uppercase",
      cursor: "pointer",
      transition: "all 0.3s",
    },
    btnGold: {
      background: "#B8963E",
      color: "#FFFDF8",
    },
    btnOutline: {
      background: "transparent",
      border: "1px solid #B8963E",
      color: "#B8963E",
    },
    btnDark: {
      background: "#2C2420",
      color: "#F5F0E6",
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      border: "1px solid #D4C5A9",
      background: "#FFFDF8",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 14,
      color: "#2C2420",
      outline: "none",
      boxSizing: "border-box",
    },
    label: {
      fontSize: 12,
      fontWeight: 500,
      color: "#8B7355",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 6,
      display: "block",
    },
  };

  // ── Loading screen ──
  if (isLoading) {
    return (
      <div
        style={{
          ...s.page,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AeternaLogo size={64} />
        <div
          style={{
            ...s.serif,
            fontSize: 13,
            letterSpacing: 4,
            color: "#B8963E",
            marginTop: 20,
            textTransform: "uppercase",
          }}
        >
          Cargando...
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={s.page}>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      {/* Viewport meta for mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
      {/* Global styles to fix mobile overflow */}
      <style>{`
        html, body { 
          margin: 0; padding: 0; 
          overflow-x: hidden; 
          background: #FAF6EE;
          -webkit-overflow-scrolling: touch;
          width: 100%;
        }
        * { box-sizing: border-box; }
        img { max-width: 100%; height: auto; }
        @media (max-width: 600px) {
          .mobile-nav { gap: 12px !important; }
          .mobile-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .mobile-grid-2 { grid-template-columns: 1fr !important; }
          .mobile-hero-text { font-size: 28px !important; }
          .mobile-testimonial { font-size: 18px !important; padding: 48px 20px !important; }
          .mobile-detail-grid { grid-template-columns: 1fr !important; }
          .mobile-admin-row { flex-direction: column !important; align-items: flex-start !important; }
          .mobile-form-grid { grid-template-columns: 1fr !important; }
          .card-info { padding: 10px 8px !important; }
          .card-title { font-size: 14px !important; }
          .card-price { font-size: 13px !important; }
          .card-stars { gap: 2px !important; }
          .card-badge { font-size: 9px !important; padding: 2px 6px !important; top: 6px !important; right: 6px !important; }
          .card-image { padding-bottom: 130% !important; }
        }
      `}</style>
      {/* Paper texture overlay */}
      <div style={s.texture} />

      <div style={s.content}>
        {/* ═══ HEADER ═══ */}
        <header style={s.header}>
          <div
            onClick={() => nav("home")}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexShrink: 1 }}
          >
            <AeternaLogo size={30} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  ...s.serif,
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: 4,
                  color: "#B8963E",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {BRAND}
              </div>
              <div
                style={{
                  fontSize: 7,
                  letterSpacing: 2,
                  color: "#8B7355",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                Concept Store
              </div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav
            className="mobile-nav"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexShrink: 0,
            }}
          >
            {[
              ["home", "Inicio"],
              ["catalog", "Colección"],
            ].map(([p, label]) => (
              <span
                key={p}
                onClick={() => nav(p)}
                style={{
                  ...s.serif,
                  fontSize: 13,
                  fontWeight: page === p ? 600 : 400,
                  letterSpacing: 1,
                  color: page === p ? "#B8963E" : "#5A4A3A",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  borderBottom: page === p ? "1px solid #B8963E" : "1px solid transparent",
                  paddingBottom: 2,
                  transition: "all 0.3s",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            ))}
            {auth.session ? (
              <span
                onClick={() => nav("admin")}
                style={{
                  ...s.serif,
                  fontSize: 12,
                  letterSpacing: 1,
                  color: "#B8963E",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Panel
              </span>
            ) : (
              <span
                onClick={() => nav("login")}
                style={{
                  fontSize: 11,
                  color: "#A09080",
                  cursor: "pointer",
                  letterSpacing: 1,
                  whiteSpace: "nowrap",
                }}
              >
                Admin
              </span>
            )}
          </nav>
        </header>

        {/* ═══ HOME PAGE ═══ */}
        {page === "home" && (
          <div>
            {/* Hero banner */}
            <div
              style={{
                padding: "100px 24px 80px",
                textAlign: "center",
                background: "linear-gradient(180deg, #FAF6EE 0%, #F0EBE0 100%)",
                borderBottom: "1px solid #E8E0D0",
              }}
            >
              <div style={{ maxWidth: 700, margin: "0 auto" }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 6,
                    color: "#B8963E",
                    textTransform: "uppercase",
                    marginBottom: 24,
                  }}
                >
                  {CITY}, Colombia
                </div>
                <h1
                  style={{
                    ...s.serif,
                    fontSize: "clamp(28px, 5vw, 48px)",
                    fontWeight: 400,
                    fontStyle: "italic",
                    color: "#2C2420",
                    lineHeight: 1.3,
                    margin: 0,
                    marginBottom: 24,
                  }}
                >
                  {TAGLINE}
                </h1>
                <Divider />
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: "#5A4A3A",
                    maxWidth: 520,
                    margin: "0 auto 40px",
                  }}
                >
                  Cada pieza AETERNA es una obra artesanal creada para honrar la Palabra
                  con la belleza que merece. Cuero genuino, detalles en oro y acabados que
                  perduran por generaciones.
                </p>
                <button
                  onClick={() => nav("catalog")}
                  style={{
                    ...s.btn,
                    ...s.btnGold,
                  }}
                >
                  Explorar Colección
                </button>
              </div>
            </div>

            {/* Value propositions */}
            <div style={{ ...s.container, padding: "80px 24px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 48,
                  textAlign: "center",
                }}
              >
                {[
                  ["Cuero Genuino", "Importado de Italia, curtido artesanalmente para una textura que mejora con los años."],
                  ["Detalles en Oro", "Grabados y bordes en oro de 24k aplicados por maestros artesanos con técnicas centenarias."],
                  ["Hecha para Siempre", "Cada Biblia viene con garantía de por vida. Una inversión que se hereda."],
                ].map(([title, desc], i) => (
                  <div key={i}>
                    <div
                      style={{
                        ...s.serif,
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#B8963E",
                        marginBottom: 12,
                      }}
                    >
                      {title}
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: "#5A4A3A", margin: 0 }}>
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured products (first 3) */}
            <div
              style={{
                ...s.container,
                paddingBottom: 80,
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 5,
                    color: "#B8963E",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Destacados
                </div>
                <h2
                  style={{
                    ...s.serif,
                    fontSize: 32,
                    fontWeight: 400,
                    margin: 0,
                    color: "#2C2420",
                  }}
                >
                  Piezas Selectas
                </h2>
              </div>
              <div
                className="mobile-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 24,
                }}
              >
                {products.slice(0, 3).map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onClick={() => nav("product", p)}
                  />
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 48 }}>
                <button
                  onClick={() => nav("catalog")}
                  style={{ ...s.btn, ...s.btnOutline }}
                >
                  Ver Toda la Colección
                </button>
              </div>
            </div>

            {/* Testimonial */}
            <div
              className="mobile-testimonial"
              style={{
                background: "#2C2420",
                padding: "80px 24px",
                textAlign: "center",
                width: "100%",
              }}
            >
              <div style={{ maxWidth: 600, margin: "0 auto" }}>
                <div style={{ ...s.serif, fontSize: 24, fontStyle: "italic", color: "#F5F0E6", lineHeight: 1.6, marginBottom: 24 }}>
                  "Cuando la abrí, entendí que no era solo un libro. Era un legado."
                </div>
                <div style={{ fontSize: 12, letterSpacing: 3, color: "#B8963E", textTransform: "uppercase" }}>
                  — María Alejandra, Cliente Génesis Imperial
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CATALOG PAGE ═══ */}
        {page === "catalog" && (
          <div style={{ ...s.container, padding: "60px 24px 80px" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 5,
                  color: "#B8963E",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Colección Completa
              </div>
              <h2
                style={{
                  ...s.serif,
                  fontSize: 36,
                  fontWeight: 400,
                  margin: 0,
                  color: "#2C2420",
                }}
              >
                Nuestras Piezas
              </h2>
              <p style={{ fontSize: 14, color: "#8B7355", marginTop: 12 }}>
                {products.length} piezas artesanales • Envío a todo {CITY}
              </p>
            </div>
            <div
              className="mobile-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 24,
              }}
            >
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={() => nav("product", p)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ═══ PRODUCT DETAIL PAGE ═══ */}
        {page === "product" && selectedProduct && (() => {
          const p = products.find((x) => x.id === selectedProduct.id) || selectedProduct;
          const prodReviews = reviews.filter((r) => r.productId === p.id);
          return (
            <div style={{ ...s.container, padding: "40px 24px 80px" }}>
              {/* Breadcrumb */}
              <div style={{ marginBottom: 32, fontSize: 13, color: "#8B7355" }}>
                <span onClick={() => nav("catalog")} style={{ cursor: "pointer", textDecoration: "underline" }}>
                  Colección
                </span>
                {" "}/ {p.name}
              </div>

              <div
                className="mobile-detail-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 32,
                }}
              >
                {/* Product image area */}
                <div>
                  <div
                    style={{
                      position: "relative",
                      paddingBottom: "130%",
                      background: `linear-gradient(145deg, #B8963E11, #8B735522)`,
                      border: "1px solid #E8E0D0",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.15,
                      }}
                    >
                      <AeternaLogo size={120} />
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        background: "rgba(255,253,248,0.92)",
                        padding: "6px 14px",
                        fontSize: 13,
                        ...s.serif,
                        fontWeight: 600,
                        color: "#B8963E",
                        letterSpacing: 2,
                      }}
                    >
                      #{p.number}
                    </div>
                    {p.image && (
                      <img src={p.image} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                </div>

                {/* Product info */}
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: 4,
                      color: "#B8963E",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Pieza #{p.number}
                  </div>
                  <h1
                    style={{
                      ...s.serif,
                      fontSize: 36,
                      fontWeight: 500,
                      margin: "0 0 16px",
                      color: "#2C2420",
                    }}
                  >
                    {p.name}
                  </h1>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <Stars rating={p.rating} size={18} />
                    <span style={{ fontSize: 14, color: "#8B7355" }}>
                      {p.rating} ({p.reviewCount} reseñas)
                    </span>
                  </div>

                  <div
                    style={{
                      ...s.serif,
                      fontSize: 32,
                      fontWeight: 600,
                      color: "#B8963E",
                      marginBottom: 24,
                    }}
                  >
                    {formatCOP(p.price)}
                  </div>

                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.8,
                      color: "#5A4A3A",
                      marginBottom: 32,
                    }}
                  >
                    {p.description}
                  </p>

                  {/* CTA: WhatsApp or Waitlist */}
                  {p.stock ? (
                    <a
                      href={buildWhatsAppUrl(p.number, p.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        ...s.btn,
                        background: "#25D366",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: 15,
                        padding: "16px 36px",
                      }}
                    >
                      <WhatsAppIcon />
                      Consultar Disponibilidad
                    </a>
                  ) : (
                    <WaitlistForm product={p} />
                  )}

                  <div
                    style={{
                      marginTop: 32,
                      padding: 20,
                      background: "#F5F0E6",
                      border: "1px solid #E8E0D0",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#8B7355", lineHeight: 1.7 }}>
                      Envío protegido a todo {CITY} • Garantía de por vida • Empaque premium de regalo incluido
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews section */}
              <div style={{ marginTop: 80 }}>
                <Divider />
                <h3
                  style={{
                    ...s.serif,
                    fontSize: 24,
                    fontWeight: 500,
                    textAlign: "center",
                    margin: "0 0 40px",
                    color: "#2C2420",
                  }}
                >
                  Reseñas de Clientes
                </h3>

                {prodReviews.length === 0 && !showReviewForm && (
                  <p style={{ textAlign: "center", color: "#8B7355", fontSize: 14 }}>
                    Aún no hay reseñas para esta pieza.
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640, margin: "0 auto" }}>
                  {prodReviews.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: 24,
                        background: "#FFFDF8",
                        border: "1px solid #E8E0D0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <Stars rating={r.stars} size={14} />
                        <span style={{ ...s.serif, fontSize: 16, fontWeight: 600, color: "#2C2420" }}>
                          {r.author}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#5A4A3A", margin: 0 }}>
                        {r.text}
                      </p>
                      <div style={{ fontSize: 11, color: "#A09080", marginTop: 10 }}>{r.date}</div>
                    </div>
                  ))}
                </div>

                {/* Add review */}
                <div style={{ textAlign: "center", marginTop: 32 }}>
                  {!showReviewForm ? (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      style={{ ...s.btn, ...s.btnOutline }}
                    >
                      Escribir Reseña
                    </button>
                  ) : (
                    <div
                      style={{
                        maxWidth: 480,
                        margin: "0 auto",
                        textAlign: "left",
                        padding: 24,
                        background: "#FFFDF8",
                        border: "1px solid #E8E0D0",
                      }}
                    >
                      <div style={{ marginBottom: 16 }}>
                        <label style={s.label}>Tu nombre</label>
                        <input
                          style={s.input}
                          value={reviewForm.author}
                          onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })}
                          placeholder="Nombre completo"
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={s.label}>Calificación</label>
                        <Stars
                          rating={reviewForm.stars}
                          size={24}
                          interactive
                          onChange={(v) => setReviewForm({ ...reviewForm, stars: v })}
                        />
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={s.label}>Tu experiencia</label>
                        <textarea
                          style={{ ...s.input, minHeight: 100, resize: "vertical" }}
                          value={reviewForm.text}
                          onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                          placeholder="Cuéntanos sobre tu experiencia con esta pieza..."
                        />
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={submitReview} style={{ ...s.btn, ...s.btnGold, flex: 1 }}>
                          Publicar
                        </button>
                        <button onClick={() => setShowReviewForm(false)} style={{ ...s.btn, ...s.btnOutline }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══ LOGIN PAGE ═══ */}
        {page === "login" && !auth.session && (
          <div
            style={{
              minHeight: "70vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 380,
                padding: 40,
                background: "#FFFDF8",
                border: "1px solid #E8E0D0",
                boxShadow: "0 8px 32px rgba(139,115,85,0.08)",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <AeternaLogo size={40} />
                <h2
                  style={{
                    ...s.serif,
                    fontSize: 22,
                    fontWeight: 500,
                    margin: "16px 0 0",
                    color: "#2C2420",
                  }}
                >
                  Acceso Privado
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={s.label}>Usuario</label>
                  <input
                    style={s.input}
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    placeholder="nombre de usuario"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
                <div>
                  <label style={s.label}>Contraseña</label>
                  <input
                    type="password"
                    style={s.input}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="••••••••"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
                {loginError && (
                  <div style={{ fontSize: 13, color: "#C0392B", textAlign: "center" }}>
                    {loginError}
                  </div>
                )}
                <button onClick={handleLogin} style={{ ...s.btn, ...s.btnDark, width: "100%" }}>
                  Ingresar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ADMIN PANEL ═══ */}
        {page === "admin" && auth.session && (
          <div style={{ ...s.container, padding: "40px 24px 80px" }}>
            {/* Admin header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 32,
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <h2
                  style={{
                    ...s.serif,
                    fontSize: 28,
                    fontWeight: 500,
                    margin: 0,
                    color: "#2C2420",
                  }}
                >
                  Panel de Administración
                </h2>
                <div style={{ fontSize: 13, color: "#8B7355", marginTop: 4 }}>
                  {auth.session.name} •{" "}
                  <span style={{ textTransform: "capitalize", color: "#B8963E" }}>
                    {auth.session.role === "superadmin" ? "Super Admin" : "Admin"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  auth.logout();
                  nav("home");
                }}
                style={{ ...s.btn, ...s.btnOutline, padding: "10px 20px" }}
              >
                Cerrar Sesión
              </button>
            </div>

            {/* Admin tabs */}
            <div
              style={{
                display: "flex",
                gap: 0,
                borderBottom: "1px solid #E8E0D0",
                marginBottom: 32,
              }}
            >
              {[
                ["products", "Productos"],
                ...(auth.session.role === "superadmin"
                  ? [["users", "Usuarios"]]
                  : []),
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setAdminTab(tab)}
                  style={{
                    ...s.serif,
                    fontSize: 14,
                    fontWeight: adminTab === tab ? 600 : 400,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    background: "none",
                    border: "none",
                    borderBottom: adminTab === tab ? "2px solid #B8963E" : "2px solid transparent",
                    padding: "12px 24px",
                    color: adminTab === tab ? "#B8963E" : "#8B7355",
                    cursor: "pointer",
                    transition: "all 0.3s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Products tab ── */}
            {adminTab === "products" && (
              <div>
                {/* Add product button */}
                <div style={{ marginBottom: 24 }}>
                  <button
                    onClick={() =>
                      setEditingProduct({
                        id: generateId(),
                        number: String(products.length + 1).padStart(3, "0"),
                        name: "",
                        price: 0,
                        description: "",
                        image: null,
                        stock: true,
                        rating: 0,
                        reviewCount: 0,
                        category: "imperial",
                        isNew: true,
                      })
                    }
                    style={{ ...s.btn, ...s.btnGold }}
                  >
                    + Nuevo Producto
                  </button>
                </div>

                {/* Edit modal */}
                {editingProduct && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      background: "rgba(44,36,32,0.5)",
                      backdropFilter: "blur(4px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 200,
                      padding: 24,
                    }}
                    onClick={(e) => e.target === e.currentTarget && setEditingProduct(null)}
                  >
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 520,
                        maxHeight: "85vh",
                        overflow: "auto",
                        background: "#FFFDF8",
                        padding: 32,
                        border: "1px solid #E8E0D0",
                      }}
                    >
                      <h3
                        style={{
                          ...s.serif,
                          fontSize: 22,
                          fontWeight: 500,
                          margin: "0 0 24px",
                          color: "#2C2420",
                        }}
                      >
                        {editingProduct.isNew ? "Nueva Pieza" : "Editar Pieza"}
                      </h3>

                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div>
                            <label style={s.label}># Producto</label>
                            <input
                              style={s.input}
                              value={editingProduct.number}
                              onChange={(e) =>
                                setEditingProduct({ ...editingProduct, number: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label style={s.label}>Categoría</label>
                            <select
                              style={s.input}
                              value={editingProduct.category}
                              onChange={(e) =>
                                setEditingProduct({ ...editingProduct, category: e.target.value })
                              }
                            >
                              <option value="imperial">Imperial</option>
                              <option value="noir">Noir</option>
                              <option value="ceremonial">Ceremonial</option>
                              <option value="heritage">Heritage</option>
                              <option value="devotional">Devotional</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={s.label}>Nombre</label>
                          <input
                            style={s.input}
                            value={editingProduct.name}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, name: e.target.value })
                            }
                            placeholder="Nombre del modelo"
                          />
                        </div>
                        <div>
                          <label style={s.label}>Precio (COP)</label>
                          <input
                            type="number"
                            style={s.input}
                            value={editingProduct.price}
                            onChange={(e) =>
                              setEditingProduct({
                                ...editingProduct,
                                price: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label style={s.label}>Descripción</label>
                          <textarea
                            style={{ ...s.input, minHeight: 100, resize: "vertical" }}
                            value={editingProduct.description}
                            onChange={(e) =>
                              setEditingProduct({ ...editingProduct, description: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label style={s.label}>Imagen del producto</label>
                          {/* Preview de imagen actual */}
                          {editingProduct.image && (
                            <div style={{ marginBottom: 12, position: "relative" }}>
                              <img
                                src={editingProduct.image}
                                alt="Preview"
                                style={{
                                  width: "100%",
                                  maxHeight: 200,
                                  objectFit: "cover",
                                  border: "1px solid #E8E0D0",
                                }}
                              />
                              <button
                                onClick={() => setEditingProduct({ ...editingProduct, image: null })}
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  background: "rgba(198,40,40,0.9)",
                                  color: "#fff",
                                  border: "none",
                                  padding: "4px 10px",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                Quitar
                              </button>
                            </div>
                          )}
                          {/* Botón para subir imagen */}
                          <div
                            style={{
                              border: "2px dashed #D4C5A9",
                              padding: 20,
                              textAlign: "center",
                              cursor: uploading ? "wait" : "pointer",
                              background: "#FAF6EE",
                              transition: "all 0.3s",
                            }}
                            onClick={() => {
                              if (!uploading) {
                                document.getElementById('image-upload-input')?.click();
                              }
                            }}
                          >
                            <input
                              id="image-upload-input"
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = await uploadImage(file);
                                  if (url) {
                                    setEditingProduct({ ...editingProduct, image: url });
                                  } else {
                                    alert("Error al subir la imagen. Intenta de nuevo.");
                                  }
                                }
                                e.target.value = '';
                              }}
                            />
                            {uploading ? (
                              <div style={{ color: "#B8963E", fontSize: 14, ...s.serif }}>
                                Subiendo imagen...
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
                                <div style={{ color: "#8B7355", fontSize: 13 }}>
                                  Toca aquí para subir una foto
                                </div>
                                <div style={{ color: "#A09080", fontSize: 11, marginTop: 4 }}>
                                  JPG, PNG o WebP
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                          <button
                            onClick={() => {
                              const { isNew, ...prod } = editingProduct;
                              saveProduct(prod);
                            }}
                            style={{ ...s.btn, ...s.btnGold, flex: 1 }}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            style={{ ...s.btn, ...s.btnOutline }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Products list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {products.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "16px 20px",
                        background: "#FFFDF8",
                        border: "1px solid #E8E0D0",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          ...s.serif,
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#B8963E",
                          minWidth: 48,
                        }}
                      >
                        #{p.number}
                      </div>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#2C2420" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 13, color: "#8B7355" }}>
                          {formatCOP(p.price)}
                        </div>
                      </div>
                      {/* Stock toggle */}
                      <div
                        onClick={() => toggleStock(p.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: "pointer",
                          padding: "6px 14px",
                          background: p.stock ? "#E8F5E9" : "#FBE9E7",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          color: p.stock ? "#2E7D32" : "#C62828",
                          transition: "all 0.3s",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 18,
                            background: p.stock ? "#4CAF50" : "#BDBDBD",
                            borderRadius: 9,
                            position: "relative",
                            transition: "background 0.3s",
                          }}
                        >
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              background: "#fff",
                              borderRadius: "50%",
                              position: "absolute",
                              top: 2,
                              left: p.stock ? 16 : 2,
                              transition: "left 0.3s",
                            }}
                          />
                        </div>
                        {p.stock ? "En stock" : "Agotado"}
                      </div>
                      {/* Actions */}
                      <button
                        onClick={() => setEditingProduct(p)}
                        style={{
                          ...s.btn,
                          padding: "8px 16px",
                          fontSize: 12,
                          ...s.btnOutline,
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${p.name}"?`)) deleteProduct(p.id);
                        }}
                        style={{
                          ...s.btn,
                          padding: "8px 16px",
                          fontSize: 12,
                          background: "transparent",
                          border: "1px solid #C62828",
                          color: "#C62828",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Users tab (SuperAdmin only) ── */}
            {adminTab === "users" && auth.session.role === "superadmin" && (
              <div>
                {/* Add user form */}
                <div
                  style={{
                    padding: 24,
                    background: "#FFFDF8",
                    border: "1px solid #E8E0D0",
                    marginBottom: 24,
                  }}
                >
                  <h4
                    style={{
                      ...s.serif,
                      fontSize: 18,
                      fontWeight: 500,
                      margin: "0 0 16px",
                      color: "#2C2420",
                    }}
                  >
                    Agregar Usuario
                  </h4>
                  <div
                    className="mobile-form-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <label style={s.label}>Nombre</label>
                      <input
                        style={s.input}
                        value={newUserForm.name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label style={s.label}>Usuario</label>
                      <input
                        style={s.input}
                        value={newUserForm.username}
                        onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                        placeholder="nombre.usuario"
                      />
                    </div>
                    <div>
                      <label style={s.label}>Contraseña</label>
                      <input
                        type="password"
                        style={s.input}
                        value={newUserForm.password}
                        onChange={(e) =>
                          setNewUserForm({ ...newUserForm, password: e.target.value })
                        }
                        placeholder="Min. 8 caracteres"
                      />
                    </div>
                    <div>
                      <label style={s.label}>Rol</label>
                      <select
                        style={s.input}
                        value={newUserForm.role}
                        onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      >
                        <option value="admin">Admin (Vendedor)</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const result = await auth.addUser(
                        newUserForm.username,
                        newUserForm.password,
                        newUserForm.role,
                        newUserForm.name
                      );
                      if (result.ok) {
                        setNewUserForm({ username: "", password: "", name: "", role: "admin" });
                      } else {
                        alert(result.msg);
                      }
                    }}
                    style={{ ...s.btn, ...s.btnGold }}
                  >
                    Crear Usuario
                  </button>
                </div>

                {/* Users list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.values(auth.users).map((u) => (
                    <div
                      key={u.username}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 20px",
                        background: "#FFFDF8",
                        border: "1px solid #E8E0D0",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "#2C2420" }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#8B7355" }}>
                          @{u.username} •{" "}
                          <span style={{ color: "#B8963E", textTransform: "capitalize" }}>
                            {u.role === "superadmin" ? "Super Admin" : "Admin"}
                          </span>
                        </div>
                      </div>
                      {u.username !== auth.session.username && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar a ${u.name}?`)) auth.removeUser(u.username);
                          }}
                          style={{
                            ...s.btn,
                            padding: "6px 14px",
                            fontSize: 12,
                            background: "transparent",
                            border: "1px solid #C62828",
                            color: "#C62828",
                          }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Redirect if admin page but no session */}
        {page === "admin" && !auth.session && (() => {
          nav("login");
          return null;
        })()}

        {/* ═══ FOOTER ═══ */}
        <footer
          style={{
            borderTop: "1px solid #E8E0D0",
            padding: "48px 24px 32px",
            textAlign: "center",
          }}
        >
          <AeternaLogo size={28} />
          <div
            style={{
              ...s.serif,
              fontSize: 14,
              letterSpacing: 4,
              color: "#B8963E",
              marginTop: 12,
              marginBottom: 8,
            }}
          >
            {BRAND}
          </div>
          <div style={{ fontSize: 12, color: "#A09080", lineHeight: 1.7 }}>
            {CITY}, Colombia
            <br />
            Piezas artesanales de edición limitada
          </div>
          <div style={{ fontSize: 11, color: "#C4B9A8", marginTop: 24 }}>
            © {new Date().getFullYear()} {BRAND} Concept Store. Todos los derechos reservados.
          </div>
        </footer>
      </div>
    </div>
  );
}
