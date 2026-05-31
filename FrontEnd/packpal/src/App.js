import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

/* ONE header controller for the whole app */
import AuthHeaderSwitcher from "./Components/Header/AuthHeaderSwitcher";

/* your existing imports (unchanged) */
import InventoryDashboard from "./Components/Dashboard/InventoryDashboard";
import ItemInventory from "./Components/ItemInventory/ItemInventory";
import Suppliers from "./Components/Suppliers/Suppliers";
import PurchaseItems from "./Components/PurchaseItems/PurchaseItems";
import ProductInventory from "./Components/ProductInventory/ProductInventory";
import Report from "./Components/Report/Report";
import Settingspul from "./Components/Settings/Settingspul";

import CartDashboard from "./Components/Dashboard/CartDashboard";
import ProductList from "./Components/Product/ProductList";
import Discounts from "./Components/Discounts/Discounts";
import Finance from "./Components/Finance/Finance";
import SalesReports from "./Components/Reports/SalesReports";
import Settingssa from "./Components/Settings/Settingssa";
import CustomerView from "./pages/CustomerView";
import Cart from "./pages/Cart";

import Udashboard from "./Components/Dashboard/Udashboard";
import Login from "./Components/Login/Login";
import UserManagement from "./Components/UserManagement/UserManagement";
import Createaccount from "./Components/CreateAccount/Createaccount";
import Orders from "./Components/Orders/Order";
import Settingsis from "./Components/Settings/Settingsis";

import FinanceDashboard from "./Components/Dashboard/FinanceDashboard";
import SalaryCal from "./Components/SalaryCal/SalaryCal";
import Attendance from "./Components/Attendance/Attendance";
import Advance from "./Components/Advance/Advance";
import SalaryTransfer from "./Components/SalaryTransfer/SalaryTransfer";
import SalaryManagement from "./Components/SalaryManagement/SalaryManagement";
import EpfManagement from "./Components/EpfManagement/EpfManagement";
import FinancialReport from "./Components/FinancialReport/FinancialReport";
import Revenue from "./Components/Revenue/Revenue";
import Setting from "./Components/Settings/Settingsanu";

import Pdashboard from "./Components/Productdashboard/Pdashboard";
import SewingInstruction from "./Components/SewingInstruction/SewingInstruction";
import Employee from "./Components/Employee/Employee";
import Reportshiru from "./Components/Reports/Reportshiru";
import Quality from "./Components/Quality/Quality";
import Settinghiru from "./Components/Setting/Settinghiru";
import HiruInventory from "./Components/HiruInventory/HiruInventory";

import AboutPage from "./Components/AboutPage/AboutPage";
import HandBag from "./Components/HandBag/HandBag";
import Home from "./Components/Home/Home";
import Accessories from "./Components/Accessories/Accessories";
import Clutches from "./Components/Clutches/Clutches";
import KidsBag from "./Components/KidsBag/KidsBag";
import Footer from "./Components/Footer/Footer";
import SizeGuide from "./Components/SizeGuide/SizeGuide";
import Sales from "./Components/Sales/Sales";
import Faq from "./Components/Faq/Faq";
import Totebags from "./Components/Totebags/Totebags";
import Feedback from "./Components/Feedback/Feedback";

/* 404 fallback */
function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h2>404 – Page not found</h2>
      <p>Route didn’t match.</p>
      <a href="/home">Go to Home</a>
    </div>
  );
}

export default function App() {
  return (
    <>
      {/* Shows header ONLY on storefront pages:
          - Logged in customer → LogoutHeader
          - Others / guests   → Header
          - Dashboards        → no header */}
      <AuthHeaderSwitcher />

      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/createaccount" element={<Createaccount />} />

        {/* Storefront (header shows via switcher) */}
        <Route path="/home" element={<Home />} />
        <Route path="/handbag" element={<HandBag />} />
        <Route path="/aboutpage" element={<AboutPage />} />
        <Route path="/accessories" element={<Accessories />} />
        <Route path="/clutches" element={<Clutches />} />
        <Route path="/kidsbag" element={<KidsBag />} />
        <Route path="/totebag" element={<Totebags />} />
        <Route path="/sizeguide" element={<SizeGuide />} />
        <Route path="/sale" element={<Sales />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/customer" element={<CustomerView />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/footer" element={<Footer />} />

        {/* Dashboards (no header) */}
        <Route path="/maindashboard" element={<InventoryDashboard />} />
        <Route path="/iteminventory" element={<ItemInventory />} />
        <Route path="/supplier" element={<Suppliers />} />
        <Route path="/purchase" element={<PurchaseItems />} />
        <Route path="/productinventory" element={<ProductInventory />} />
        <Route path="/report" element={<Report />} />
        <Route path="/settingspul" element={<Settingspul />} />

        <Route path="/dashboard" element={<CartDashboard />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/discounts" element={<Discounts />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/reports" element={<SalesReports />} />
        <Route path="/settingssa" element={<Settingssa />} />

        <Route path="/isudashboard" element={<Udashboard />} />
        <Route path="/usermanagement" element={<UserManagement />} />
        <Route path="/order" element={<Orders />} />
        <Route path="/settingsis" element={<Settingsis />} />

        <Route path="/sanudashboard" element={<FinanceDashboard />} />
        <Route path="/salarycal" element={<SalaryCal />} />
        <Route path="/epf" element={<EpfManagement />} />
        <Route path="/financereport" element={<FinancialReport />} />
        <Route path="/revenue" element={<Revenue />} />
        <Route path="/settingsanu" element={<Setting />} />
        <Route path="/finance/employees" element={<SalaryCal />} />
        <Route path="/finance/attendance" element={<Attendance />} />
        <Route path="/finance/advance" element={<Advance />} />
        <Route path="/finance/transfers" element={<SalaryTransfer />} />
        <Route path="/finance/salary" element={<SalaryManagement />} />

        <Route path="/hirudashboard" element={<Pdashboard />} />
        <Route path="/sewing" element={<SewingInstruction />} />
        <Route path="/employee" element={<Employee />} />
        <Route path="/reportshiru" element={<Reportshiru />} />
        <Route path="/hiruinventory" element={<HiruInventory />} />
        <Route path="/quality" element={<Quality />} />
        <Route path="/settinghiru" element={<Settinghiru />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
