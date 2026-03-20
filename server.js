const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// --- 1. CORS SETTINGS (FIXED) ---
app.use(cors({
    origin: '*', // Sabhi websites (Netlify, Mobile) ko allow karein
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
const Patient = mongoose.model('Patient', new mongoose.Schema({ name: String, mobile: String }));
const Consultation = mongoose.model('Consultation', new mongoose.Schema({ patientName: String, fees: Number, status: { type: String, default: 'Waiting' }, diagnosis: String, medicines: String, date: { type: Date, default: Date.now } }));
const Billing = mongoose.model('Billing', new mongoose.Schema({ patientName: String, amount: Number, date: { type: Date, default: Date.now } }));
const LabReport = mongoose.model('LabReport', new mongoose.Schema({ patientName: String, testName: String, result: String, status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now } }));

// --- 4. ROUTES ---

// Server Check Route (Taki "Cannot GET /" na aaye)
app.get('/', (req, res) => {
    res.send("🚀 Bittu Hospital API is LIVE!");
});

app.post('/register-patient', async (req, res) => {
    try { const p = new Patient(req.body); await p.save(); res.send({ message: "Registered!" }); }
    catch (err) { res.status(500).send(err); }
});

app.get('/get-patients', async (req, res) => {
    const data = await Patient.find().sort({_id: -1}); res.send(data);
});

app.post('/add-billing', async (req, res) => {
    const b = new Billing(req.body); await b.save();
    const c = new Consultation({ patientName: req.body.patientName, fees: req.body.amount });
    await c.save();
    res.send({ message: "Bill Saved!" });
});

app.get('/doctor-queue', async (req, res) => {
    const queue = await Consultation.find({ status: 'Waiting' }).sort({ date: 1 }); res.send(queue);
});

app.put('/prescribe-patient/:id', async (req, res) => {
    await Consultation.findByIdAndUpdate(req.params.id, { ...req.body, status: 'Checked' });
    res.send({ message: "Saved!" });
});

app.get('/patient-history', async (req, res) => {
    const history = await Consultation.find({ status: 'Checked' }).sort({ date: -1 }); res.send(history);
});

app.get('/get-lab-pending', async (req, res) => {
    const pending = await LabReport.find({ status: 'Pending' }); res.send(pending);
});

// --- 5. START SERVER ---
const PORT = process.env.PORT || 10000; // Render usually uses port 10000
app.listen(PORT, () => console.log(`🚀 Server Running on port ${PORT}`));
