import { defineStore } from 'pinia'
import {ref, computed, toValue, toRaw, inject } from 'vue'
import Status from '../classes/Status';
///import Wallet from '../classes/Wallet';
import KeyStore from '../classes/keyStore';


export const useWalletStore = defineStore('walletStore', () => {

    const botUtils = inject("botUtils")

    const $state = ref({
        password:           "",
        defaultWallet:      null,
        wallets:            {},
        activeWallet:     null
    }); 


    const defaultWallet     = computed(()       =>    $state.value.defaultWallet )
    const wallets           = computed(()       =>    $state.value.wallets )
    const password          = computed(()       =>    $state.value.password )
    const processedPass     = computed(()       =>    processPassword($state.value.password) )
    const activeWallet      = computed(()       =>    $state.value.activeWallet)
    const activeWalletFull  = computed(()       =>    '0x' + $state.value.activeWallet)
    
    const setState = (key, value) => $state.value[key] = value

    const setPassword = (pass) => {
        setState("password", pass)
    }

    const getUserInfo = () => {
        return botUtils.getUserInfo()
    }
    
    const processPassword = (_pass="") => {

        _pass = toValue(_pass).toString().trim()

        //console.log("_pass===>2", _pass)

        if(_pass == '' ) return _pass
        
        let userInfo = botUtils.getUserInfo()

        if(userInfo == null) return _pass

        return `${botUtils.botPlatform}_${userInfo.id}_${_pass}`
    }

    const getPassword = async () => {
        return password.value.toString().trim()
    }
    
    const doLogin = async (pass) => {
        
        let _ppass = processPassword(pass)

        let userId = getUserInfo().id;

        let defaultWalletStatus = await KeyStore.getDefaultWallet(userId, _ppass)
        
        if(defaultWalletStatus.isError()){

            let errMsg = defaultWalletStatus.getMessage()

            if(errMsg == 'wallet_decryption_failed'){
                return Status.errorPromise("Failed to decrypt wallet, check password")
            }

            return defaultWalletStatus
        }

        setState("defaultWallet", defaultWalletStatus.getData())

        // lets now fetch the accounts
        let accountsStatus = await KeyStore.getWallets(userId, _ppass)

        if(accountsStatus.isError()){
            return accountsStatus
        }

        setState("wallets", accountsStatus.getData());
        setState("password", pass)

        getActiveWalletInfo()
      
        return Status.successPromise()
    } //end do login 


    const setActiveWallet = (addr) => {

        addr = addr.toLowerCase()

        if(addr.startsWith("0x")) addr = addr.substring(2)

        setState('activeWallet', addr)

        localStorage.setItem(`${getUserInfo().id}_active_wallet`, addr)
    }

    const getActiveWalletInfo = () => {
        
        let _swalletAddr = activeWallet.value || ""
        
        if(_swalletAddr.length == ''){
            _swalletAddr = localStorage.getItem(`${getUserInfo().id}_active_wallet`) || ''
        }

        if(_swalletAddr == ''){
            _swalletAddr = Object.keys(wallets.value)[0]
        }

        if(_swalletAddr.startsWith("0x")){
            _swalletAddr = _swalletAddr.substring(2)
        }

        _swalletAddr = _swalletAddr.toLowerCase()

        let w = wallets.value[_swalletAddr];

       setActiveWallet( w.wallet.address )

        return wallets.value[_swalletAddr]
    }
 
    const isLoggedIn = () => {
        return (password.value != '' && 
            defaultWallet.value != null && 
            Object.keys(wallets.value).length > 0
        )
    }

    const logout = () => {
        $state.value = {
            password: '',
            defaultWallet: null,
            wallets: {}
        }

       return Status.success()
    }

    const hasDefaultWallet = () => {
        return KeyStore.hasDefaultWallet(getUserInfo().id)
    }

    const saveDefaultWallet = async (_walletInfo) => {
        
        let userId = getUserInfo().id;

        let saveStatus = await KeyStore.saveDefaultWallet(
                            userId,
                            processPassword(password), 
                            toRaw(_walletInfo)
                        )

        if(saveStatus.isError()){
            return saveStatus
        }

        setState("defaultWallet", saveStatus.getData())
        updateAccounts();

        return saveStatus
    }

    const updateAccounts = async () => {
        
        let pass = processPassword(toValue(password))

        
        if(pass == "") {
            return Status.error("Pasword is required")
        }

        let userId = getUserInfo().id;

        let walletsStatus = await KeyStore.getWallets(userId, toValue(pass))

        if(walletsStatus.isError()){
            return walletsStatus
        }

        setState("wallets", walletsStatus.getData())

        return walletsStatus
    }

    const resetWallets = async () => {

        let userId = getUserInfo().id;

        await KeyStore.resetWallets(userId)
        
        $state.value = {
            wallets: {},
            defaultWallet: null 
        }

        return Status.success()
    }

    return {
        hasDefaultWallet,
        updateAccounts,
        wallets,
        defaultWallet,
        saveDefaultWallet,
        setActiveWallet,
        activeWallet,
        activeWalletFull,
        getActiveWalletInfo,
        getPassword,
        setPassword,
        doLogin,
        isLoggedIn,
        resetWallets,
        logout
    }
})