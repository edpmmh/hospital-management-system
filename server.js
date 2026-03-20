const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// --- 1. CORS SETTINGS (FIXED) ---
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

// --- 3. SCHEMAS (Updated with MRD and Address) ---
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
    fees: Number, 
    status: { type: String, default: 'Waiting' }, 
    diagnosis: String, 
    medicines: String, 
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

// Server Check Route
app.get('/', (req, res) => {
    res.send("🚀 Bittu Hospital API is LIVE and Updated!");
});

// Register New Patient
app.post('/register-patient', async (req, res) => {
    try { 
        const p = new Patient(req.body); 
        await p.save(); 
        res.send({ message: "Registered Successfully!" }); 
    } catch (err) { res.status(500).send(err); }
});

// Update Existing Patient (Edit Feature)
app.put('/update-patient/:id', async (req, res) => {
    try {
        await Patient.findByIdAndUpdate(req.params.id, req.body);
        res.send({ message: "Patient Updated Successfully!" });
    } catch (err) { res.status(500).send(err); }
});

// Get All Patients List
app.get('/get-patients', async (req, res) => {
    try {
        const data = await Patient.find().sort({_id: -1}); 
        res.send(data);
    } catch (err) { res.status(500).send(err); }
});

// OPD Billing & Doctor Queue
app.post('/add-billing', async (req, res) => {
    try {
        const b = new Billing(req.body); 
        await b.save();
        const c = new Consultation({ 
            patientName: req.body.patientName, 
            mrd: req.body.mrd,
            fees: req.body.amount 
        });
        await c.save();
        res.send({ message: "Bill Saved & Added to Doctor Queue!" });
    } catch (err) { res.status(500).send(err); }
});

// Doctor Queue (Waiting Patients)
app.get('/doctor-queue', async (req, res) => {
    try {
        const queue = await Consultation.find({ status: 'Waiting' }).sort({ date: 1 }); 
        res.send(queue);
    } catch (err) { res.status(500).send(err); }
});

// Doctor Prescription
app.put('/prescribe-patient/:id', async (req, res) => {
    try {
        await Consultation.findByIdAndUpdate(req.params.id, { ...req.body, status: 'Checked' });
        res.send({ message: "Prescription Saved!" });
    } catch (err) { res.status(500).send(err); }
});

// Completed Visits History
app.get('/patient-history', async (req, res) => {
    try {
        const history = await Consultation.find({ status: 'Checked' }).sort({ date: -1 }); 
        res.send(history);
    } catch (err) { res.status(500).send(err); }
});

// Laboratory Pending Reports
app.get('/get-lab-pending', async (req, res) => {
    try {
        const pending = await LabReport.find({ status: 'Pending' }); 
        res.send(pending);
    } catch (err) { res.status(500).send(err); }
});

// --- 5. START SERVER ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server Running on port ${PORT}`));
