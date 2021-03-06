const jsonfile = require('jsonfile');
import {LOGGER} from "../../utils/logger";
const path = require('path');
const fs = require('fs');
import {isArray, isNullOrUndefined, isObject, isString} from "util";
import MetadataValidationError from "../errors/MetadataValidationError";

/**
 * Length of property's object
 * @type {number}
 */
const PROPERTY_LENGTH = 2;

/**
 * Class that responds for validation of metadata from
 * all configuration files context should receive
 */
class MetadataValidator {

    /**
     * Method that validates configuration files' existence
     * and their format as JSON
     * @param paths
     * @returns {Array} of parsed objects from metadata
     */
    private static validateConfigurationFiles(paths: string[]): Object[] {
        let configFilesContent = [];
        paths.forEach((path) => {
            try {
                fs.statSync(path);
                LOGGER.debug(`[Metadata Validation]: Configuration file by path "${path}" was found`);
                configFilesContent.push({path: path, content: jsonfile.readFileSync(path)});
            } catch (err) {
                LOGGER.error(`[Metadata Validation]: Cannot read the file by the following path: "${path}".`);
            }
        });
        return configFilesContent;
    }

    /**
     * Method that validates parsed objects from metadata
     * according to the library's specification
     * @param configFilesContent parsed content from metadata
     * @returns {Array} configuration objects (special objects
     * on the highest level of the metadata hierarchy)
     */
    private static validateConfigurationObjects(configFilesContent: Object[]): Object[] {
        let configuratioObjects = [];
        configFilesContent.forEach((file) => {
            let configurationObject = file['content']['configuration'];
            if (!configurationObject) {
                LOGGER.error(`[Metadata Validation]: Configuration object from metadata in file "${file['path']}" does not exist`);
                throw new MetadataValidationError(file['path']);
            }
            configuratioObjects.push({filePath: file['path'], configuration: configurationObject});
        });
        return configuratioObjects;
    }

    /**
     * Method that validates arrays of possible components
     * @param configurationObjects special objects
     * on the highest level of the metadata hierarchy
     */
    private static validateComponentsArray(configurationObjects: Object[]): void {
        let componentsArrays = [];
        configurationObjects.forEach((configObj) => {
            let componentsArray = configObj['configuration']['components'];
            if (!componentsArray) {
                LOGGER.error(`[Metadata Validation]: Components' array from metadata in file "${configObj['filePath']}" does not exist`);
                throw new MetadataValidationError(configObj['filePath']);
            }
            let componentsArrayDescriptor = {filePath: configObj['filePath'], components: componentsArray};
            MetadataValidator.validateConfigComponent(componentsArrayDescriptor);
        });
    }

    /**
     * Method that validates the object instance of possible component
     * @param componentsArrayDescriptor descriptor of an array of possible components
     * that stores information about its content and the path to the configuration file
     */
    private static validateConfigComponent(componentsArrayDescriptor: Object): void {
        componentsArrayDescriptor['components'].forEach((comp, index) => {
            if (!isObject(comp)) {
                LOGGER.error(`[Metadata Validation]: Component[${index}] from metadata in file "${componentsArrayDescriptor['filePath']}" is not an object`);
                throw new MetadataValidationError(componentsArrayDescriptor['filePath']);
            }
            let componentDescriptor = {index: index, instance: comp, filePath: componentsArrayDescriptor['filePath']};
            MetadataValidator.validateConfigLifecycle(componentDescriptor);
            MetadataValidator.validateConfigScope(componentDescriptor);
            MetadataValidator.validateConfigProperties(componentDescriptor);
        });
    }

    /**
     * Method that validates the existence of lifecycle's method in the lifecycle object
     * @param lifecycle object
     * @param methodName name of method
     * @returns {boolean} validation result
     */
    private static configLifecycleHasMethod(lifecycle: Object, methodName: string): boolean {
        return lifecycle.hasOwnProperty(methodName) && isString(lifecycle[methodName]);
    }

    /**
     * Method that validated lifecycle object according to the library's specification
     * @param componentDescriptor descriptor that stores information about
     * component object's position in the array of possible components, its instance and
     * path to the configuration file
     */
    private static validateConfigLifecycle(componentDescriptor: Object): void {
        const configLifecycle = componentDescriptor['instance']['lifecycle'];
        if (!configLifecycle) {
            LOGGER.warn(`[Metadata Validation]: Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']}" has no lifecycle object`);
        } else {
            if (!isObject(configLifecycle)) {
                LOGGER.error(`[Metadata Validation]: Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']}" has invalid lifecycle object`);
                throw new MetadataValidationError(componentDescriptor['filePath']);
            }
            const lifecycleMethods = Object.keys(configLifecycle);
            lifecycleMethods.forEach((method) => {
                let methodExists = MetadataValidator.configLifecycleHasMethod(configLifecycle, method);
                if(!methodExists) {
                    LOGGER.error(`[Metadata Validation]: Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']}" has invalid lifecycle object`);
                    throw new MetadataValidationError(componentDescriptor['filePath']);
                }
            });
            LOGGER.debug(`[Metadata Validation]: Lifecycle of the Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']}" is successfully validated`);
        }
    }

    /**
     * Method that validates property object's name existence and type
     * @param property object
     * @returns {boolean|Object} validation result
     */
    private static configPropertyHasName(property: Object): boolean {
        return property.hasOwnProperty('name') && isString(property['name']);
    }

    /**
     * Method that validates property object's value existence and type
     * @param property object
     * @returns {boolean|Object} validation result
     */
    private static configPropertyHasValue(property: Object): boolean {
        return property.hasOwnProperty('value') && !isNullOrUndefined(property['value']);
    }

    /**
     * Method that validates property object's reference existence and type
     * @param property object
     * @returns {boolean|Object} validation result
     */
    private static configPropertyHasReference(property: Object): boolean {
        return property.hasOwnProperty('reference') && isString(property['reference']);
    }

    /**
     * Method that validated properties' array according to the library's specification
     * @param componentDescriptor descriptor that stores information about
     * component object's position in the array of possible components, its instance and
     * path to the configuration file
     */
    private static validateConfigProperties(componentDescriptor: Object): void {
        let configProperties = componentDescriptor['instance']['properties'];
        if (!isArray(configProperties)) {
            LOGGER.error(`[Metadata Validation]: Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']}"has invalid properties' instance`);
            throw new MetadataValidationError(componentDescriptor['filePath']);
        }
        configProperties.forEach((prop) => {
            if (Object.keys(prop).length === PROPERTY_LENGTH && MetadataValidator.configPropertyHasName(prop)) {
                if (MetadataValidator.configPropertyHasValue(prop) || MetadataValidator.configPropertyHasReference(prop)) {
                    LOGGER.debug(`[Metadata Validation]: Property "${prop['name']}" of the Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']} is successfully validated`)
                } else {
                    LOGGER.error(`[Metadata Validation]: Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']} has invalid property "${prop['name']}"`);
                    throw new MetadataValidationError(componentDescriptor['filePath']);
                }
            }
        });
    }

    /**
     * Method that validated properties' scope according to the library's specification
     * @param componentDescriptor descriptor that stores information about
     * component object's position in the array of possible components, its instance and
     * path to the configuration file
     */
    private static validateConfigScope(componentDescriptor: Object): void {
        let configScope = componentDescriptor['instance']['scope'];
        if (configScope) {
            if (!isString(configScope) || !['singleton', 'prototype'].includes(configScope)) {
                LOGGER.error(`[Metadata Validation]: Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']}" has invalid scope`);
                throw new MetadataValidationError(componentDescriptor['filePath']);
            } else {
                LOGGER.debug(`[Metadata Validation]: Scope of the Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']} is successfully validated`);
            }
        } else {
            LOGGER.debug(`[Metadata Validation]: Scope of the Component[${componentDescriptor['index']}] from metadata in file "${componentDescriptor['filePath']}" will be set to SINGLETON as default`);
        }
    }

    /**
     * Main method that validates all metadata from configuration files
     * @param paths to the configuration files
     */
    public static validateMetadata(paths: string[]): void {
        LOGGER.info('[Metadata Validation]: Metadata validation process is starting...');
        const configFilesContent = MetadataValidator.validateConfigurationFiles(paths);
        const configurationKeywords = MetadataValidator.validateConfigurationObjects(configFilesContent);
        MetadataValidator.validateComponentsArray(configurationKeywords);
        LOGGER.info('[Metadata Validation]: Metadata validation process was finished...');
    }
}

export default MetadataValidator;