package util;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.olingo.commons.api.data.Entity;
import org.apache.olingo.commons.api.data.EntityCollection;
import org.apache.olingo.commons.api.data.Property;
import org.apache.olingo.commons.api.edm.Edm;
import org.apache.olingo.commons.api.edm.EdmEntitySet;
import org.apache.olingo.commons.api.edm.EdmEntityType;
import org.apache.olingo.commons.api.edm.EdmPrimitiveType;
import org.apache.olingo.commons.api.edm.EdmPrimitiveTypeException;
import org.apache.olingo.commons.api.edm.EdmPrimitiveTypeKind;
import org.apache.olingo.commons.api.edm.EdmProperty;
import org.apache.olingo.commons.api.edm.EdmType;
import org.apache.olingo.commons.api.http.HttpStatusCode;
import org.apache.olingo.server.api.ODataApplicationException;
import org.apache.olingo.server.api.uri.UriInfoResource;
import org.apache.olingo.server.api.uri.UriParameter;
import org.apache.olingo.server.api.uri.UriResource;
import org.apache.olingo.server.api.uri.UriResourceEntitySet;
import org.smap.sdal.constants.SmapQuestionTypes;
import org.smap.sdal.managers.EmailManager;
import org.smap.sdal.model.KeyFilter;

public class Util {
	
	private static Logger log =
			Logger.getLogger(EmailManager.class.getName());

    public static EdmEntitySet getEdmEntitySet(UriInfoResource uriInfo) throws ODataApplicationException {

        List<UriResource> resourcePaths = uriInfo.getUriResourceParts();
         // To get the entity set we have to interpret all URI segments
        if (!(resourcePaths.get(0) instanceof UriResourceEntitySet)) {
            throw new ODataApplicationException("Invalid resource type for first segment.",
                                    HttpStatusCode.NOT_IMPLEMENTED.getStatusCode(),Locale.ENGLISH);
        }

        UriResourceEntitySet uriResource = (UriResourceEntitySet) resourcePaths.get(0);

        return uriResource.getEntitySet();
    }

    public static Entity findEntity(EdmEntityType edmEntityType,
                                    EntityCollection rt_entitySet, List<UriParameter> keyParams)
                                    throws ODataApplicationException {

        List<Entity> entityList = rt_entitySet.getEntities();

        // loop over all entities in order to find that one that matches all keys in request
        // an example could be e.g. contacts(ContactID=1, CompanyID=1)
        for(Entity rt_entity : entityList){
            boolean foundEntity = entityMatchesAllKeys(edmEntityType, rt_entity, keyParams);
            if(foundEntity){
                return rt_entity;
            }
        }

        return null;
    }


    public static ArrayList<KeyFilter> getKeyFilter(EdmEntityType edmEntityType,  List<UriParameter> keyParams) {
    		ArrayList<KeyFilter> filters = new ArrayList<> ();
    		
    		 for (final UriParameter key : keyParams) {
    			 KeyFilter kf = new KeyFilter();
    			 kf.name = key.getName();
    			 EdmProperty edmKeyProperty = (EdmProperty) edmEntityType.getProperty(kf.name);
    			 EdmPrimitiveType edmType = (EdmPrimitiveType)edmKeyProperty.getType();
    			 kf.sValue = key.getText();  			 
    			
    			 String type = edmType.getName();
    			 if(type.equals(EdmPrimitiveTypeKind.Int32.name())) {
    				 try {
    					 kf.iValue = Integer.valueOf(kf.sValue);
    				 } catch(Exception e) {
    					 log.info("Failed to convert " + kf.sValue + " to integer");
    					 log.log(Level.SEVERE, "Messaging Exception");
    				 }
    			 }
    			 
    			 // Adjust for usage in backend system
    			 if(kf.name.equals("ID")) {
    				 kf.name = "prikey";
    			 }
    			 
    			 filters.add(kf);
    			 
 

    		 }
    		 
    		return filters;
    }
    
    public static boolean entityMatchesAllKeys(EdmEntityType edmEntityType, Entity rt_entity,  List<UriParameter> keyParams)
                                                throws ODataApplicationException {

        // loop over all keys
        for (final UriParameter key : keyParams) {
            // key
            String keyName = key.getName();
            String keyText = key.getText();

            // Edm: we need this info for the comparison below
            EdmProperty edmKeyProperty = (EdmProperty )edmEntityType.getProperty(keyName);
            Boolean isNullable = edmKeyProperty.isNullable();
            Integer maxLength = edmKeyProperty.getMaxLength();
            Integer precision = edmKeyProperty.getPrecision();
            Boolean isUnicode = edmKeyProperty.isUnicode();
            Integer scale = edmKeyProperty.getScale();
            // get the EdmType in order to compare
            EdmType edmType = edmKeyProperty.getType();
            // Key properties must be instance of primitive type
            EdmPrimitiveType edmPrimitiveType = (EdmPrimitiveType)edmType;

            // Runtime data: the value of the current entity
            Object valueObject = rt_entity.getProperty(keyName).getValue(); // null-check is done in FWK

            // now need to compare the valueObject with the keyText String
            // this is done using the type.valueToString //
            String valueAsString = null;
            try {
                valueAsString = edmPrimitiveType.valueToString(valueObject, isNullable, maxLength,
                                                                precision, scale, isUnicode);
            } catch (EdmPrimitiveTypeException e) {
                throw new ODataApplicationException("Failed to retrieve String value",
                                             HttpStatusCode.INTERNAL_SERVER_ERROR.getStatusCode(),Locale.ENGLISH, e);
            }

            if (valueAsString == null){
                return false;
            }

            boolean matches = valueAsString.equals(keyText);
            if(!matches){
                // if any of the key properties is not found in the entity, we don't need to search further
                return false;
            }
        }

        return true;
    }
    
    public static String convertFormToEntityName(String formName) {
    		return formName + " item";
    }
    
    public static String getCsdlType(String smapType) {
    	
    		String csdlType = null;
    		
    		if(smapType.equals(SmapQuestionTypes.STRING)) {
    			csdlType = EdmPrimitiveTypeKind.String.getFullQualifiedName().toString();
    		} else if(smapType.equals(SmapQuestionTypes.INT)) {
    			csdlType = EdmPrimitiveTypeKind.Int32.getFullQualifiedName().toString();
    		} else if(smapType.equals(SmapQuestionTypes.SELECT1)) {
    			csdlType = EdmPrimitiveTypeKind.String.getFullQualifiedName().toString();
    		} else if(smapType.equals(SmapQuestionTypes.DATETIME)) {
    			//csdlType = EdmPrimitiveTypeKind.DateTimeOffset.getFullQualifiedName().toString();	// TODO
    			csdlType = EdmPrimitiveTypeKind.String.getFullQualifiedName().toString();
    		} else {
    			log.info("Error: Unknown smap question type, setting csdl type to String: " + smapType);
    			csdlType = EdmPrimitiveTypeKind.String.getFullQualifiedName().toString();
    		}
    		return csdlType;
    }
}
