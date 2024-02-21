import React from "react";
import styled from "styled-components";
import { MdDashboard,MdAutoGraph } from "react-icons/md";
import { FaGetPocket } from "react-icons/fa";
import { IoMdSettings,IoMdLogOut,IoMdNotifications } from "react-icons/io";
import { GrTransaction } from "react-icons/gr";
import { TiExport } from "react-icons/ti";

const Container = styled.div`
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    box-shadow:  0 7px 33px rgba(0,0,0,.3);
    
    div div{
        display: flex;
        align-items: center;
        gap: .5rem;
        font-size: .8rem;
        padding:0 0.3rem;
        margin: .3rem;
        transition: transform .3s ease-in-out;
        position: relative;
        right: 0;

        &:hover>*:nth-child(1){
            width: 15px;
            height: 15px;
            padding: 0.3rem;
            border-radius: 50%;
            display: grid;
            place-items: center;
            color: #1029cd;
            background-color: #fff;
        }
        

        &:hover{
            background-color: blue;
            cursor: pointer;
            color: #fff;
            border-radius: 5px;
            box-shadow: 0 10px 32px rgba(0,0,0,.3);
        }
    }
`

function SidebarLayout() {
  return (
    <Container>
        <div className="sidebar">
            <div className="sidebarItem">
                <MdDashboard/>
                <p>Dashboard</p>
            </div>
            <div className="sidebarItem">
                <FaGetPocket/>
                <p>Incomes</p>
            </div>
            <div className="sidebarItem">
                <TiExport/>
                <p>Expenses</p>
            </div>
            <div className="sidebarItem">
                <GrTransaction/>
                <p>Transactions</p>
            </div>
            <div className="sidebarItem">
                <MdAutoGraph/>
                <p>Reports</p>
            </div>
            <div className="sidebarItem">
                <IoMdNotifications/>
                <p>Notifications</p>
            </div>
            
        </div>

        <div className="sidebarFooter">
            <div className="sidebarItem">
                <IoMdSettings/>
                <p>Settings</p>
            </div>

            <div className="sidebarItem">
                <IoMdLogOut/>
                <p>Logout</p>
            </div>

            
        </div>
    </Container>
  );
}

export default SidebarLayout;