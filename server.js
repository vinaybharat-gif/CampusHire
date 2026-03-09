const express=require("express")
const mongoose=require("mongoose")
const bcrypt=require("bcryptjs")
const jwt=require("jsonwebtoken")
const cors=require("cors")
require("dotenv").config()

const app=express()

app.use(cors())
app.use(express.json())
app.use(express.static(__dirname))

mongoose.connect(process.env.MONGO_URI)

const User=mongoose.model("User",{
name:String,
email:{type:String,unique:true},
password_hash:String,
role:String
})

app.post("/api/register",async(req,res)=>{
const{name,email,password,role}=req.body

try{
const salt=await bcrypt.genSalt(10)
const hash=await bcrypt.hash(password,salt)

const user=new User({
name,
email,
password_hash:hash,
role
})

await user.save()

res.json({message:"User registered"})
}catch(e){
res.status(400).json({error:"Email already exists"})
}
})

app.post("/api/login",async(req,res)=>{
const{email,password}=req.body

const user=await User.findOne({email})

if(!user)return res.status(401).json({error:"User not found"})

const ok=await bcrypt.compare(password,user.password_hash)

if(!ok)return res.status(401).json({error:"Invalid password"})

const token=jwt.sign(
{id:user._id,role:user.role},
process.env.JWT_SECRET,
{expiresIn:"1d"}
)

res.json({token,role:user.role})
})

app.get("/",(req,res)=>{
res.sendFile(__dirname+"/index.html")
})

const PORT=process.env.PORT||3000
app.listen(PORT,()=>console.log("Server running on "+PORT))