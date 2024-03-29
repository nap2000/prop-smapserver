package service;

import java.io.InputStream;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.olingo.commons.api.data.ContextURL;
import org.apache.olingo.commons.api.data.EntityCollection;
import org.apache.olingo.commons.api.edm.EdmEntitySet;
import org.apache.olingo.commons.api.edm.EdmEntityType;
import org.apache.olingo.commons.api.format.ContentType;
import org.apache.olingo.commons.api.http.HttpHeader;
import org.apache.olingo.commons.api.http.HttpStatusCode;
import org.apache.olingo.server.api.OData;
import org.apache.olingo.server.api.ODataApplicationException;
import org.apache.olingo.server.api.ODataRequest;
import org.apache.olingo.server.api.ODataResponse;
import org.apache.olingo.server.api.ServiceMetadata;
import org.apache.olingo.server.api.processor.EntityCollectionProcessor;
import org.apache.olingo.server.api.serializer.EntityCollectionSerializerOptions;
import org.apache.olingo.server.api.serializer.ODataSerializer;
import org.apache.olingo.server.api.serializer.SerializerException;
import org.apache.olingo.server.api.serializer.SerializerResult;
import org.apache.olingo.server.api.uri.UriInfo;
import org.apache.olingo.server.api.uri.UriResource;
import org.apache.olingo.server.api.uri.UriResourceEntitySet;
import org.smap.sdal.managers.EmailManager;

import data.ReportStorage;

public class OdataReportEntityCollectionProcessor implements EntityCollectionProcessor {

	private static Logger log =
			Logger.getLogger(EmailManager.class.getName());
	
	private OData odata;
	private ServiceMetadata serviceMetadata;
	private ReportStorage storage;
	
	public OdataReportEntityCollectionProcessor(ReportStorage storage) {
        this.storage = storage;
    }
	
	@Override
	public void init(OData odata, ServiceMetadata serviceMetadata) {
		this.odata = odata;
		this.serviceMetadata = serviceMetadata;
	}

	@Override
	public void readEntityCollection(ODataRequest request, ODataResponse response, UriInfo uriInfo, ContentType responseFormat)
		    throws ODataApplicationException, SerializerException {
		
		try {
			EdmEntitySet responseEdmEntitySet = null; // for building ContextURL
			EntityCollection responseEntityCollection = null; // for the response body
			
			// 1st retrieve the requested EntitySet from the uriInfo
			List<UriResource> resourceParts = uriInfo.getUriResourceParts();
			int segmentCount = resourceParts.size();
			
			UriResource uriResource = resourceParts.get(0); // the first segment is the EntitySet
			if (! (uriResource instanceof UriResourceEntitySet)) {
			    throw new ODataApplicationException("Only EntitySet is supported", HttpStatusCode.NOT_IMPLEMENTED.getStatusCode(),storage.locale);
			}
			
			UriResourceEntitySet uriResourceEntitySet = (UriResourceEntitySet) uriResource;
			EdmEntitySet startEdmEntitySet = uriResourceEntitySet.getEntitySet();
	
			if(segmentCount == 1){ // this is the case for: DemoService/DemoService.svc/Categories
			    responseEdmEntitySet = startEdmEntitySet; // first (and only) entitySet
			    // 2nd: fetch the data from backend for this requested EntitySetName
			    // it has to be delivered as EntitySet object
			    try {
			    		responseEntityCollection = storage.readEntitySetData(startEdmEntitySet);
			    } catch (Exception e) {
			    		log.log(Level.SEVERE, "Messaging Exception", e);
			    		throw new ODataApplicationException(e.getMessage(), 0, storage.locale);
			    }
			} else{ // this would be the case for e.g. Products(1)/Category/Products
			    throw new ODataApplicationException("Not supported", HttpStatusCode.NOT_IMPLEMENTED.getStatusCode(), storage.locale);
			}
	
			  // 3rd: create a serializer based on the requested format (json)
			  ODataSerializer serializer = odata.createSerializer(responseFormat);
	
			  // 4th: Now serialize the content: transform from the EntitySet object to InputStream
			  EdmEntityType edmEntityType = responseEdmEntitySet.getEntityType();
			  ContextURL contextUrl = ContextURL.with().entitySet(responseEdmEntitySet).build();
			  final String id = request.getRawBaseUri() + "/" + responseEdmEntitySet.getName();
	
			  EntityCollectionSerializerOptions opts = EntityCollectionSerializerOptions.with().id(id).contextURL(contextUrl).build();
			  SerializerResult serializerResult = serializer.entityCollection(serviceMetadata, edmEntityType, responseEntityCollection, opts);
			  InputStream serializedContent = serializerResult.getContent();
	
			  // Finally: configure the response object: set the body, headers and status code
			  response.setContent(serializedContent);
			  response.setStatusCode(HttpStatusCode.OK.getStatusCode());
			  response.setHeader(HttpHeader.CONTENT_TYPE, responseFormat.toContentTypeString());
		} catch (Exception e) {
			log.log(Level.SEVERE, e.getMessage(), e);
			throw e;
		}

	}

}
