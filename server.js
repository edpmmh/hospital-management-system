const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// --- 1. CORS & MIDDLEWARE ---
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// --- 2. DATABASE CONNECTION ---
const cloudURI = process.env.MONGO_URI; 

mongoose.connect(cloudURI)
    .then(() => console.log("☁️ Connected to MongoDB Atlas!"))
    .catch(err => console.error("❌ Database Error:", err));

// --- 3. SCHEMAS ---

// User Schema for Staff Login 
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: String, unique: true },
    password: { type: String, default: '123' },
    role: String // admin, doctor, pharmacy, receptionist, billing
}));

const Patient = mongoose.model('Patient', new mongoose.Schema({
    mrd: String, 
    name: String, 
    age: Number, 
    gender: String, 
    mobile: String, 
    address: String,
    date: { type: Date, default: Date.now }
}));

const Consultation = mongoose.model('Consultation', new mongoose.Schema({ 
    patientName: String, 
    mrd: String,
    doctorName: String, 
    fees: Number, 
    status: { type: String, default: 'Waiting' }, // Waiting -> Checked -> Dispensed
    diagnosis: String, 
    medicines: String, 
    pharmacyBill: Number,
    date: { type: Date, default: Date.now } 
}));

const Billing = mongoose.model('Billing', new mongoose.Schema({ 
    patientName: String, 
    mrd: String,
    amount: Number, 
    date: { type: Date, default: Date.now } 
}));

const LabReport = mongoose.model('LabReport', new mongoose.Schema({ 
    patientName: String, 
    mrd: String,
    testName: String, 
    result: String, 
    status: { type: String, default: 'Pending' }, 
    date: { type: Date, default: Date.now } 
}));

// --- 4. ROUTES ---

app.get('/', (req, res) => {
    res.send("🚀 Bittu Hospital API is LIVE and Secure!");
});

// Role-Based Queue Fetching 
app.get('/get-queue/:role', async (req, res) => {
    try {
        let query = {};
        if (req.params.role === 'doctor') query = { status: 'Waiting' };
        if (req.params.role === 'pharmacy') query = { status: 'Checked' };
        
        const data = await Consultation.find(query).sort({ date: 1 });
        res.send(data);
    } catch (err) { res.status(500).send(err); }
});

// Register New Patient
app.post('/register-patient', async (req, res) => {
    try { 
        const p = new Patient(req.body); 
        await p.save(); 
        res.send({ message: "Registered Successfully!" }); 
    } catch (err) { res.status(500).send(err); }
});

// Update Patient / Prescribe / Dispense
app.put('/update-consultation/:id', async (req, res) => {
    try {
        // Dynamic update for both Doctor and Pharmacy 
        await Consultation.findByIdAndUpdate(req.params.id, req.body);
        res.send({ message: "Record Updated!" });
    } catch (err) { res.status(500).send(err); }
});

// OPD Billing
app.post('/add-billing', async (req, res) => {
    try {
        const b = new Billing(req.body); 
        await b.save();
        const c = new Consultation({ 
            patientName: req.body.patientName, 
            mrd: req.body.mrd,
            fees: req.body.amount,
            doctorName: req.body.doctorName 
        });
        await c.save();
        res.send({ message: "Bill Saved & Added to Queue!" });
    } catch (err) { res.status(500).send(err); }
});

app.get('/get-patients', async (req, res) => {
    try {
        const data = await Patient.find().sort({_id: -1}); 
        res.send(data);
    } catch (err) { res.status(500).send(err); }
});

// --- 5. START SERVER ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server Running on port ${PORT}`));
