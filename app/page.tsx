"use client";

import { useState, useEffect } from "react";

import { db, storage } from "../firebase"; // ✅ COMBINED

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from "firebase/firestore";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Animal = {
  id: string;
  name: string;
  type: string;
  status: string;
  gender: string;
  pregnancy?: string;
  location: string;
  dob: string;
  image?: string | null;
};

export default function Home() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [folderSearch, setFolderSearch] = useState<Record<string, string>>({});

  const [user, setUser] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  const emptyForm: Animal = {
    id: "",
    name: "",
    type: "",
    status: "",
    gender: "",
    pregnancy: "",
    location: "",
    dob: "",
    image: null
  };

  const [form, setForm] = useState<Animal>(emptyForm);

  const locations = ["Onderumbua", "Otjozohungu", "Morukutu"];

  // ✅ AUTO OPEN FOLDERS
  useEffect(() => {
    const initial = Object.fromEntries(locations.map(l => [l, true]));
    setOpenFolders(initial);
  }, []);

  // ✅ LOAD USER
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(savedUser);
  }, []);

  // ✅ FIRESTORE + SORTING
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "animals"), snapshot => {
      const data = snapshot.docs
        .map(d => ({
          id: d.id,
          ...d.data()
        })) as Animal[];

      // ✅ SORT BY NEWEST DOB
      data.sort(
        (a, b) =>
          new Date(b.dob || 0).getTime() -
          new Date(a.dob || 0).getTime()
      );

      setAnimals(data);
    });

    return () => unsubscribe();
  }, []);

  // ✅ LOGIN (ENV VERSION)
  const handleLogin = () => {
    if (
      loginForm.username === process.env.NEXT_PUBLIC_USER &&
      loginForm.password === process.env.NEXT_PUBLIC_PASS
    ) {
      localStorage.setItem("user", loginForm.username);
      setUser(loginForm.username);
    } else {
      alert("Invalid login");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>🔐 Login</h1>

        <div style={styles.form}>
          <input
            placeholder="Username"
            value={loginForm.username}
            onChange={e =>
              setLoginForm({ ...loginForm, username: e.target.value })
            }
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={e =>
              setLoginForm({ ...loginForm, password: e.target.value })
            }
            style={styles.input}
          />

          <button style={styles.button} onClick={handleLogin}>
            Login
          </button>
        </div>
      </div>
    );
  }

  // ✅ HANDLE CHANGE
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm(prev => {
      if (name === "gender" && value === "Male") {
        return { ...prev, gender: value, pregnancy: "" };
      }
      return { ...prev, [name]: value };
    });
  };

  // ✅ IMAGE
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // ✅ Create unique filename
      const imageRef = ref(
        storage,
        `animals/${Date.now()}-${file.name}`
      );

      // ✅ Upload file
      await uploadBytes(imageRef, file);

      // ✅ Get URL
      const url = await getDownloadURL(imageRef);

      // ✅ Save URL
      setForm(prev => ({
        ...prev,
        image: url
      }));

    } catch (error) {
      console.error("Upload error:", error);
      alert("Image upload failed");
    }
  };

  // ✅ ADD / UPDATE (NO ID STORED)
  const addOrUpdateAnimal = async () => {
    if (!form.name || !form.type || !form.status || !form.location) {
      alert("Fill all required fields");
      return;
    }

    const { id, ...data } = form;

    if (editId) {
      await updateDoc(doc(db, "animals", editId), data);
      setEditId(null);
    } else {
      await addDoc(collection(db, "animals"), data);
    }

    setForm(emptyForm);
    setSelectedImage(null);
  };

  const startEdit = (animal: Animal) => {
    setForm(animal);
    setEditId(animal.id);
  };

  // ✅ CONFIRM DELETE
  const removeAnimal = async (id: string) => {
    if (!confirm("Delete this animal?")) return;
    await deleteDoc(doc(db, "animals", id));
  };

  // ✅ GROUPING
  const groupedAnimals = animals.reduce((acc, animal) => {
    if (!acc[animal.location]) acc[animal.location] = [];
    acc[animal.location].push(animal);
    return acc;
  }, {} as Record<string, Animal[]>);

  const toggleFolder = (location: string) => {
    setOpenFolders(prev => ({
      ...prev,
      [location]: !prev[location]
    }));
  };

  // ✅ SAFE STATS
  const getStats = (loc: string) => {
    const data = animals.filter(a => a.location === loc);
    return {
      alive: data.filter(a => a.status?.toLowerCase() === "alive").length,
      dead: data.filter(a => a.status?.toLowerCase() === "dead").length,
      sold: data.filter(a => a.status?.toLowerCase() === "sold").length
    };
  };

  const totalStats = {
    alive: animals.filter(a => a.status?.toLowerCase() === "alive").length,
    dead: animals.filter(a => a.status?.toLowerCase() === "dead").length,
    sold: animals.filter(a => a.status?.toLowerCase() === "sold").length
  };

  // ✅ AGE CALCULATOR
  const getAge = (dob: string) => {
    if (!dob) return "-";
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🌱 Tjivatje Farming</h1>

      <button style={{ ...styles.button, marginBottom: 10 }} onClick={handleLogout}>
        Logout
      </button>

      <div style={styles.totalCard}>
        <h2>Total Farm</h2>
        <p>Alive: {totalStats.alive}</p>
        <p>Dead: {totalStats.dead}</p>
        <p>Sold: {totalStats.sold}</p>
        <p>Total: {animals.length}</p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "15px",
          marginBottom: "20px",
          flexWrap: "wrap"
        }}
      >
        {locations.map(loc => {
          const s = getStats(loc);
          return (
            <div key={loc} style={styles.card}>
              <h3>{loc}</h3>
              <p>Alive: {s.alive}</p>
              <p>Dead: {s.dead}</p>
              <p>Sold: {s.sold}</p>
            </div>
          );
        })}
      </div>

      <div style={styles.form}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" style={styles.input} />
        <input name="type" value={form.type} onChange={handleChange} placeholder="Type" style={styles.input} />

        <select name="status" value={form.status} onChange={handleChange} style={styles.input}>
          <option value="">Status</option>
          <option>Alive</option>
          <option>Dead</option>
          <option>Sold</option>
        </select>

        <select name="gender" value={form.gender} onChange={handleChange} style={styles.input}>
          <option value="">Gender</option>
          <option>Male</option>
          <option>Female</option>
        </select>

        {form.gender === "Female" && (
          <select name="pregnancy" value={form.pregnancy} onChange={handleChange} style={styles.input}>
            <option value="">Pregnancy</option>
            <option>Pregnant</option>
            <option>Not Pregnant</option>
          </select>
        )}

        <select name="location" value={form.location} onChange={handleChange} style={styles.input}>
          <option value="">Location</option>
          {locations.map(l => <option key={l}>{l}</option>)}
        </select>

        <input type="date" name="dob" value={form.dob} onChange={handleChange} style={styles.input} />
        <input type="file" onChange={handleImage} />

        <button style={styles.button} onClick={addOrUpdateAnimal}>
          {editId ? "Update" : "Add"}
        </button>
      </div>

      
      {Object.entries(groupedAnimals).map(([location, group]) => {
        const text = (folderSearch[location] || "").toLowerCase();

        const filtered = group.filter(a =>
          (a.name || "").toLowerCase().includes(text)
        );

        return (
          <div key={location} style={{ marginBottom: 25 }}>
            <h2
              style={{ color: "#22c55e", cursor: "pointer" }}
              onClick={() => toggleFolder(location)}
            >
              📁 {location} (
              {folderSearch[location]
                ? `${filtered.length} / ${group.length}`
                : group.length}
              )
            </h2>

            {openFolders[location] && (
              <>
                <input
                  placeholder="Search in folder..."
                  value={folderSearch[location] || ""}
                  onChange={e =>
                    setFolderSearch(prev => ({
                      ...prev,
                      [location]: e.target.value
                    }))
                  }
                  style={{ ...styles.input, marginBottom: 10 }}
                />

                {filtered.map(a => (
                  <div key={a.id} style={styles.listCard}>
                    {a.image && (
                      <img
                        src={a.image}
                        style={styles.img}
                        onClick={() => setSelectedImage(a.image!)}
                      />
                    )}

                    <div>
                      <b>{a.name}</b> ({a.type})<br />
                      Status: {a.status}<br />
                      Gender: {a.gender}<br />
                      Pregnancy: {a.pregnancy || "-"}<br />
                      Location: {a.location}<br />
                      DOB: {a.dob}<br />
                      Age: {getAge(a.dob)} yrs
                    </div>

                    <div>
                      <button onClick={() => startEdit(a)}>Edit</button>
                      <button style={styles.deleteBtn} onClick={() => removeAnimal(a.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}

      {selectedImage && (
        <div style={styles.modal} onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} style={styles.modalImg} />
        </div>
      )}
    </div>
  );
}
const styles = {
  container: {
    padding: 20,
    background: "#0f172a",
    minHeight: "100vh",
    color: "#fff"
  },

  title: {
    color: "#22c55e",
    marginBottom: 20
  },


  dashboard: {
    display: "flex",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap"
  },
  card: {
    background: "#1e293b",
    padding: 15,
    borderRadius: 10
  },

  totalCard: {
    background: "#166534",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20
  },

  form: {
    display: "grid",
    gap: "15px",
marginBottom: "20px",
  },

  input: {
    padding: 10,
    background: "#1e293b",
    border: "1px solid #334155",
    color: "white"
  },

  button: {
    background: "#22c55e",
    padding: 10,
    border: "none",
    borderRadius: 6,
    cursor: "pointer"
  },

  listCard: {
    display: "flex",
    gap: 15,
    padding: 15,
    background: "#1e293b",
    borderRadius: 10,
    marginBottom: 10
  },

  img: {
    width: 100,
    height: 100,
    objectFit: "cover",
    borderRadius: 8
  },

  deleteBtn: {
    background: "#dc2626",
    color: "white",
    padding: 5,
    marginLeft: 5
  },

  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  modalImg: {
    maxWidth: "90%",
    maxHeight: "90%"
  }
};