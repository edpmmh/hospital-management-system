const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// --- 1. SETTINGS & MIDDLEWARE ---
// Origin '*' ka matlab hai ki mobile aur doosre PC se connection block nahi hoga
app.use(cors());
app.use(bodyParser.json());

// --- 2. CLOUD DATABASE CONNECTION ---
const cloudURI = process.env.MONGO_URI; 

mongoose.connect(cloudURI)
    .then(() => console.log("☁️ Connected to MongoDB Atlas Successfully!"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- 3. SCHEMAS ---
const Patient = mongoose.model('Patient', new mongoose.Schema({
    name: String, age: Number, mobile: String, aadhaar: String, address: String
}));

const Consultation = mongoose.model('Consultation', new mongoose.Schema({
    patientName: String, fees: Number, status: { type: String, default: 'Waiting' }, 
    diagnosis: String, medicines: String, date: { type: Date, default: Date.now }
}));

const Billing = mongoose.model('Billing', new mongoose.Schema({
    patientName: String, amount: Number, mode: String, date: { type: Date, default: Date.now }
}));

const Medicine = mongoose.model('Medicine', new mongoose.Schema({
    name: String, stock: Number, price: Number
}));

const LabReport = mongoose.model('LabReport', new mongoose.Schema({
    patientName: String, testName: String, result: String, status: { type: String, default: 'Pending' }, date: { type: Date, default: Date.now }
}));

// --- 4. ROUTES ---

// Home Route (Taki "Cannot GET /" wala error na aaye)
app.get('/', (req, res) => {
    res.send("🚀 Bittu Hospital Server is LIVE and Running Successfully!");
});

// Registration & Master List
app.post('/register-patient', async (req, res) => {
    try { const p = new Patient(req.body); await p.save(); res.send({ message: "Registered!" }); }
    catch (err) { res.status(500).send(err); }
});

app.get('/get-patients', async (req, res) => {
    try { const data = await Patient.find().sort({_id: -1}); res.send(data); }
    catch (err) { res.status(500).send(err); }
});

// Billing & Doctor Queue
app.post('/add-billing', async (req, res) => {
    try {
        const b = new Billing(req.body); await b.save();
        const c = new Consultation({ patientName: req.body.patientName, fees: req.body.amount, status: 'Waiting' });
        await c.save();
        res.send({ message: "Bill Saved!" });
    } catch (err) { res.status(500).send(err); }
});

// Doctor & History
app.get('/doctor-queue', async (req, res) => {
    try { const queue = await Consultation.find({ status: 'Waiting' }).sort({ date: 1 }); res.send(queue); }
    catch (err) { res.status(500).send(err); }
});

app.put('/prescribe-patient/:id', async (req, res) => {
    try {
        const { diagnosis, medicines } = req.body;
        await Consultation.findByIdAndUpdate(req.params.id, { diagnosis, medicines, status: 'Checked' });
        
        // Pharmacy Stock Deduction Logic
        let meds = medicines.split('\n');
        for (let m of meds) { 
            await Medicine.findOneAndUpdate(
                { name: new RegExp(m.split('-')[0].trim(), 'i') }, 
                { $inc: { stock: -1 } }
            ); 
        }
        res.send({ message: "Prescription Saved!" });
    } catch (err) { res.status(500).send(err); }
});

app.get('/patient-history', async (req, res) => {
    try { const history = await Consultation.find({ status: 'Checked' }).sort({ date: -1 }); res.send(history); }
    catch (err) { res.status(500).send(err); }
});

// Laboratory
app.post('/add-lab-test', async (req, res) => {
    try { const test = new LabReport(req.body); await test.save(); res.send({ message: "Test Added!" }); }
    catch (err) { res.status(500).send(err); }
});

app.get('/get-lab-pending', async (req, res) => {
    try { const pending = await LabReport.find({ status: 'Pending' }); res.send(pending); }
    catch (err) { res.status(500).send(err); }
});

app.put('/update-lab-result/:id', async (req, res) => {
    try {
        await LabReport.findByIdAndUpdate(req.params.id, { result: req.body.result, status: 'Completed' });
        res.send({ message: "Report Generated!" });
    } catch (err) { res.status(500).send(err); }
});

// Pharmacy Stock
app.post('/add-medicine', async (req, res) => {
    try { const m = new Medicine(req.body); await m.save(); res.send({ message: "Stock Updated!" }); }
    catch (err) { res.status(500).send(err); }
});

app.get('/get-stock', async (req, res) => {
    try { const stock = await Medicine.find().sort({ name: 1 }); res.send(stock); }
    catch (err) { res.status(500).send(err); }
});

// --- 5. SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Running on port ${PORT}`));
