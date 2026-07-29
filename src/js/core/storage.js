(() => {
    const STORAGE_PREFIX = "finly_";
    const STORAGE_EVENT = "finly:storage-change";

    const isStorageAvailable = () => {
        try {
            const testKey = `${STORAGE_PREFIX}storage_test`;

            localStorage.setItem(testKey, "ok");
            localStorage.removeItem(testKey);

            return true;
        } catch {
            return false;
        }
    };

    const normalizeKey = (key) => {
        const cleanKey = String(key || "").trim();

        if (!cleanKey) {
            throw new Error("A chave do armazenamento não pode estar vazia.");
        }

        return cleanKey.startsWith(STORAGE_PREFIX)
            ? cleanKey
            : `${STORAGE_PREFIX}${cleanKey}`;
    };

    const safeParse = (value, fallback = null) => {
        if (value === null || value === undefined) {
            return fallback;
        }

        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    };

    const notifyChange = ({ action, key, value = null }) => {
        window.dispatchEvent(
            new CustomEvent(STORAGE_EVENT, {
                detail: {
                    action,
                    key,
                    value,
                    timestamp: new Date().toISOString()
                }
            })
        );
    };

    const get = (key, fallback = null) => {
        if (!isStorageAvailable()) {
            return fallback;
        }

        try {
            const normalizedKey = normalizeKey(key);
            const storedValue = localStorage.getItem(normalizedKey);

            return safeParse(storedValue, fallback);
        } catch (error) {
            console.error("FinlyStorage: erro ao buscar dados.", error);
            return fallback;
        }
    };

    const getRaw = (key, fallback = null) => {
        if (!isStorageAvailable()) {
            return fallback;
        }

        try {
            const normalizedKey = normalizeKey(key);
            const storedValue = localStorage.getItem(normalizedKey);

            return storedValue ?? fallback;
        } catch (error) {
            console.error("FinlyStorage: erro ao buscar dado bruto.", error);
            return fallback;
        }
    };

    const set = (key, value) => {
        if (!isStorageAvailable()) {
            console.error("FinlyStorage: localStorage indisponível.");
            return false;
        }

        try {
            const normalizedKey = normalizeKey(key);
            const serializedValue = JSON.stringify(value);

            localStorage.setItem(normalizedKey, serializedValue);

            notifyChange({
                action: "set",
                key: normalizedKey,
                value
            });

            return true;
        } catch (error) {
            console.error("FinlyStorage: erro ao salvar dados.", error);
            return false;
        }
    };

    const setRaw = (key, value) => {
        if (!isStorageAvailable()) {
            console.error("FinlyStorage: localStorage indisponível.");
            return false;
        }

        try {
            const normalizedKey = normalizeKey(key);

            localStorage.setItem(normalizedKey, String(value));

            notifyChange({
                action: "set-raw",
                key: normalizedKey,
                value
            });

            return true;
        } catch (error) {
            console.error("FinlyStorage: erro ao salvar dado bruto.", error);
            return false;
        }
    };

    const remove = (key) => {
        if (!isStorageAvailable()) {
            return false;
        }

        try {
            const normalizedKey = normalizeKey(key);

            localStorage.removeItem(normalizedKey);

            notifyChange({
                action: "remove",
                key: normalizedKey
            });

            return true;
        } catch (error) {
            console.error("FinlyStorage: erro ao remover dados.", error);
            return false;
        }
    };

    const has = (key) => {
        if (!isStorageAvailable()) {
            return false;
        }

        try {
            const normalizedKey = normalizeKey(key);

            return localStorage.getItem(normalizedKey) !== null;
        } catch {
            return false;
        }
    };

    const update = (key, updater, fallback = null) => {
        if (typeof updater !== "function") {
            console.error("FinlyStorage: o atualizador precisa ser uma função.");
            return fallback;
        }

        const currentValue = get(key, fallback);
        const updatedValue = updater(currentValue);

        if (updatedValue === undefined) {
            return currentValue;
        }

        const saved = set(key, updatedValue);

        return saved ? updatedValue : currentValue;
    };

    const append = (key, item) => {
        return update(
            key,
            (currentValue) => {
                const list = Array.isArray(currentValue)
                    ? currentValue
                    : [];

                return [...list, item];
            },
            []
        );
    };

    const prepend = (key, item) => {
        return update(
            key,
            (currentValue) => {
                const list = Array.isArray(currentValue)
                    ? currentValue
                    : [];

                return [item, ...list];
            },
            []
        );
    };

    const keys = () => {
        if (!isStorageAvailable()) {
            return [];
        }

        return Object.keys(localStorage)
            .filter((key) => key.startsWith(STORAGE_PREFIX))
            .sort();
    };

    const getAll = () => {
        return keys().reduce((result, key) => {
            result[key] = safeParse(localStorage.getItem(key), localStorage.getItem(key));
            return result;
        }, {});
    };

    const clearFinlyData = (preserveKeys = []) => {
        if (!isStorageAvailable()) {
            return false;
        }

        try {
            const normalizedPreserveKeys = preserveKeys.map(normalizeKey);

            keys().forEach((key) => {
                if (!normalizedPreserveKeys.includes(key)) {
                    localStorage.removeItem(key);
                }
            });

            notifyChange({
                action: "clear",
                key: STORAGE_PREFIX
            });

            return true;
        } catch (error) {
            console.error("FinlyStorage: erro ao limpar os dados.", error);
            return false;
        }
    };

    const exportData = () => {
        return {
            app: "Finly",
            version: "1.0",
            exportedAt: new Date().toISOString(),
            data: getAll()
        };
    };

    const importData = (backup, options = {}) => {
        const { replace = false } = options;

        if (!backup || typeof backup !== "object") {
            return {
                success: false,
                imported: 0,
                message: "Backup inválido."
            };
        }

        const data = backup.data && typeof backup.data === "object"
            ? backup.data
            : backup;

        const validEntries = Object.entries(data).filter(([key]) => {
            return key.startsWith(STORAGE_PREFIX);
        });

        if (!validEntries.length) {
            return {
                success: false,
                imported: 0,
                message: "Nenhum dado válido do Finly foi encontrado."
            };
        }

        try {
            if (replace) {
                clearFinlyData();
            }

            validEntries.forEach(([key, value]) => {
                if (typeof value === "string") {
                    localStorage.setItem(key, value);
                    return;
                }

                localStorage.setItem(key, JSON.stringify(value));
            });

            notifyChange({
                action: "import",
                key: STORAGE_PREFIX,
                value: validEntries.length
            });

            return {
                success: true,
                imported: validEntries.length,
                message: "Dados importados com sucesso."
            };
        } catch (error) {
            console.error("FinlyStorage: erro ao importar dados.", error);

            return {
                success: false,
                imported: 0,
                message: "Não foi possível importar os dados."
            };
        }
    };

    const subscribe = (callback) => {
        if (typeof callback !== "function") {
            return () => {};
        }

        const handler = (event) => {
            callback(event.detail);
        };

        window.addEventListener(STORAGE_EVENT, handler);

        return () => {
            window.removeEventListener(STORAGE_EVENT, handler);
        };
    };

    window.FinlyStorage = Object.freeze({
        prefix: STORAGE_PREFIX,
        available: isStorageAvailable,
        get,
        getRaw,
        set,
        setRaw,
        remove,
        has,
        update,
        append,
        prepend,
        keys,
        getAll,
        clear: clearFinlyData,
        exportData,
        importData,
        subscribe
    });
})();