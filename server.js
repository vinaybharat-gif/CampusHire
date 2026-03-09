const express=require("express")
const mysql=require("mysql2/promise")
const bcrypt=require("bcryptjs")
const jwt=require("jsonwebtoken")
const cors=require("cors")
require("dotenv").config()

const app=express()

app.use(cors())
app.use(express.json())
app.use(express.static(__dirname))

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '13032025',
  database: 'campusHire'
}

let db;

async function connectDB() {
  try {
    db = await mysql.createPool(dbConfig)
    console.log("Connected to MySQL")
    
    // Create users table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'student'
      )
    `)
    console.log("Users table ready")
  } catch (error) {
    console.error("MySQL connection error:", error)
    process.exit(1)
  }
}

connectDB()

app.post("/api/register",async(req,res)=>{
const{name,email,password,role}=req.body

try{
const salt=await bcrypt.genSalt(10)
const hash=await bcrypt.hash(password,salt)

await db.execute(
  'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
  [name, email, hash, role]
)

res.json({message:"User registered"})
}catch(e){
if(e.code === 'ER_DUP_ENTRY'){
res.status(400).json({error:"Email already exists"})
} else {
res.status(500).json({error:"Server error"})
}
}
})

app.post("/api/login",async(req,res)=>{
const{email,password}=req.body

try{
const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email])

if(rows.length === 0)return res.status(401).json({error:"User not found"})

const user = rows[0]

const ok=await bcrypt.compare(password,user.password_hash)

if(!ok)return res.status(401).json({error:"Invalid password"})

const token=jwt.sign(
{id:user.id,role:user.role},
process.env.JWT_SECRET,
{expiresIn:"1d"}
)

res.json({token,role:user.role})
} catch(e){
res.status(500).json({error:"Server error"})
}
})

app.get("/",(req,res)=>{
res.sendFile(__dirname+"/index.html")
})

const PORT=process.env.PORT||3000
app.listen(PORT,()=>console.log("Server running on "+PORT))