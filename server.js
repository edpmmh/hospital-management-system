const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- 1. CLOUD DATABASE CONNECTION ---
// NOTE: <db_password> ki jagah apna real password likhein bina < > brackets ke.
const cloudURI = "mongodb+srv://mmh:mmh2026.khwfbh8.mongodb.net/hospital_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(cloudURI)
    .then(() => console.log("☁️ Connected to MongoDB Atlas (Cloud)!"))
    .catch(err => console.error("❌ Cloud Connection Error:", err));

// --- 2. SCHEMAS ---
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

// --- 3. ROUTES ---

// Registration & Master List
app.post('/register-patient', async (req, res) => {
    try { const p = new Patient(req.body); await p.save(); res.send({ message: "Registered!" }); }
    catch (err) { res.status(500).send(err); }
});

app.get('/get-patients', async (req, res) => {
    const data = await Patient.find().sort({_id: -1}); res.send(data);
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
    const queue = await Consultation.find({ status: 'Waiting' }).sort({ date: 1 }); res.send(queue);
});

app.put('/prescribe-patient/:id', async (req, res) => {
    try {
        const { diagnosis, medicines } = req.body;
        await Consultation.findByIdAndUpdate(req.params.id, { diagnosis, medicines, status: 'Checked' });
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
    const history = await Consultation.find({ status: 'Checked' }).sort({ date: -1 }); res.send(history);
});

// Laboratory
app.post('/add-lab-test', async (req, res) => {
    const test = new LabReport(req.body); await test.save(); res.send({ message: "Test Added!" });
});

app.get('/get-lab-pending', async (req, res) => {
    const pending = await LabReport.find({ status: 'Pending' }); res.send(pending);
});

app.put('/update-lab-result/:id', async (req, res) => {
    await LabReport.findByIdAndUpdate(req.params.id, { result: req.body.result, status: 'Completed' });
    res.send({ message: "Report Generated!" });
});

app.get('/get-lab-completed', async (req, res) => {
    const done = await LabReport.find({ status: 'Completed' }).sort({ date: -1 }); res.send(done);
});

// Pharmacy Stock
app.post('/add-medicine', async (req, res) => {
    const m = new Medicine(req.body); await m.save(); res.send({ message: "Stock Updated!" });
});

app.get('/get-stock', async (req, res) => {
    const stock = await Medicine.find().sort({ name: 1 }); res.send(stock);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Running on port ${PORT}`));