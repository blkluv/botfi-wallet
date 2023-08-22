/**
 * BotFi (https://botfi.app)
 * @author BotFi <hello@botfi.app>
 */

import { encryptKeystoreJson, decryptKeystoreJson, getAddress, Wallet as ethersWallet } from "ethers"
import Utils from "./Utils"
import Status from "./Status"
import { toValue } from "vue"
import Crypt from "./Crypt"


export default class KeyStore {

    static DEFAULT_WALLET_KEY = (userId) => `${userId}__botfi_dw_info`
    static WALLETS_KEY = (userId) => `${userId}__botfi_wallets`

    static async getDefaultWallet(userId,password) {
        try {
            
            //console.log("password===>", password)

            if(password == ''){
                return Status.errorPromise("password_required")
            }

            let defaultWalletDataStr = localStorage.getItem(this.DEFAULT_WALLET_KEY(userId)) || ""

            if(defaultWalletDataStr == ""){
                return Status.errorPromise("default_account_not_found")
            }
            
            let decryptedData;

            try {
               
                // decryptedData = await ethersWallet.fromEncryptedJson(walletData.data, password)
               decryptedData = await Crypt.decrypt(password, defaultWalletDataStr)

            } catch(e){
                
                if(e.code == "INVALID_ARGUMENT" && e.argument == "password"){
                    return Status.errorPromise("Invalid password")
                }

                Utils.logError(`KeyStore#getDefaultWallet:`, e)
                return Status.errorPromise("wallet_decryption_failed")
            }

            return Status.successData(decryptedData)

        } catch(e){
            Utils.logError(`walletStore#getDefaultWallet:`, e)
            return Status.errorPromise("failed to fetch default wallet")
        }
    }

    static async resetWallets(userId){
        localStorage.removeItem(this.DEFAULT_WALLET_KEY(userId))
        localStorage.removeItem(this.WALLETS_KEY(userId))
    }

    static hasDefaultWallet(userId) {
        return (localStorage.getItem(this.DEFAULT_WALLET_KEY(userId)) || "").trim().length > 0
    }

    static async saveDefaultWallet(userId, password, walletInfo) {
        try {

            let defaultWalletKey = this.DEFAULT_WALLET_KEY(userId)

            if ((localStorage.getItem(defaultWalletKey) || "").length > 0){
                return Status.errorPromise("Default account already exists, it cannot be overwritten")
            }

            password = toValue(password)

            let phrase = walletInfo.mnemonic.phrase

            let encryptedData = await Crypt.encrypt(password, phrase)

            localStorage.setItem(defaultWalletKey, encryptedData)

            let walletAcctData = {
                address:    walletInfo.address, 
                privateKey: walletInfo.privateKey,
                index:      0,
                imported:   false
            }

            let saveWalletStatus = await this.saveWallet(userId, password, walletAcctData)

            if(saveWalletStatus.isError()){
                this.resetAccount(userId)
                return saveWalletStatus
            }
            
            return Status.successData(walletInfo)
        } catch(e){
            Utils.logError(`walletStore#saveDefaultWallet:`, e)
            return Status.errorPromise()
        }
    }

    static async getWallets(userId, password) {

        password = toValue(password)

        let walletsStr = (localStorage.getItem(this.WALLETS_KEY(userId)) || "").trim()

        if(walletsStr == ""){
            return Status.successData({})
        }

        let walletsObj = {}

        try { walletsObj = JSON.parse(walletsStr) } catch(e){}

        if(Object.keys(walletsObj).length == 0){
            return Status.successData({})
        }

        ///console.log("password===>",password)

        for(let key of Object.keys(walletsObj)){
            try {

                let item = walletsObj[key]

                let decryptedData = await Crypt.decrypt(password, item.wallet)

                let decryptedWallet = JSON.parse(decryptedData)

                walletsObj[key].wallet =  decryptedWallet

                if(item.name == ''){
                    walletsObj[key].name = decryptedWallet.address;
                }
            } catch(e){ 
                console.log("KeyStore#getAcounts:", key, e)
                continue; 
            }
        }

        return Status.successData(walletsObj)
    }

    static async saveWallet(userId, password, opts = {}) {

        let { name = "", address, privateKey, index = 0, imported} = opts;

        let wallets = {}

        let dbWalletsStr = (localStorage.getItem(this.WALLETS_KEY(userId)) || "").trim()

        if(dbWalletsStr != ""){
            try { 
                wallets = JSON.parse(dbWalletsStr) 
            } catch(e){
                return Status.errorPromise("Failed to decode accounts store data")
            }
        }

        address = getAddress(address)

        let walletInfo = {
            address, 
            privateKey
        }

        password = toValue(password)
        
        let encryptedWallet = await Crypt.encrypt(password, JSON.stringify(walletInfo))

        let dataToSave = {
            name, 
            wallet: encryptedWallet,
            index, 
            imported
        }

        let key = address.toLowerCase().substring(2);

        wallets[key] = dataToSave

        localStorage.setItem(this.WALLETS_KEY(userId), JSON.stringify(wallets))
 
        return Status.successPromise()
    }

}