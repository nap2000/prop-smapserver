package service;

import java.io.InputStream;
import java.util.List;

import org.apache.olingo.commons.api.data.ContextURL;
import org.apache.olingo.commons.api.data.Entity;
import org.apache.olingo.commons.api.edm.EdmEntitySet;
import org.apache.olingo.commons.api.edm.EdmEntityType;
import org.apache.olingo.commons.api.format.ContentType;
import org.apache.olingo.commons.api.http.HttpHeader;
import org.apache.olingo.commons.api.http.HttpStatusCode;
import org.apache.olingo.server.api.OData;
import org.apache.olingo.server.api.ODataApplicationException;
import org.apache.olingo.server.api.ODataLibraryException;
import org.apache.olingo.server.api.ODataRequest;
import org.apache.olingo.server.api.ODataResponse;
import org.apache.olingo.server.api.ServiceMetadata;
import org.apache.olingo.server.api.processor.EntityProcessor;
import org.apache.olingo.server.api.serializer.EntitySerializerOptions;
import org.apache.olingo.server.api.serializer.ODataSerializer;
import org.apache.olingo.server.api.serializer.SerializerException;
import org.apache.olingo.server.api.serializer.SerializerResult;
import org.apache.olingo.server.api.uri.UriInfo;
import org.apache.olingo.server.api.uri.UriParameter;
import org.apache.olingo.server.api.uri.UriResource;
import org.apache.olingo.server.api.uri.UriResourceEntitySet;

import data.Storage;

public class DemoEntityProcessor implements EntityProcessor {

	private OData odata;
	private ServiceMetadata serviceMetadata;
	private Storage storage;

	public DemoEntityProcessor(Storage storage) {
		this.storage = storage;
	}

	@Override
	public void init(OData odata, ServiceMetadata serviceMetadata) {
		this.odata = odata;
		this.serviceMetadata = serviceMetadata;
	}

	@Override
	public void createEntity(ODataRequest arg0, ODataResponse arg1, UriInfo arg2, ContentType arg3, ContentType arg4)
			throws ODataApplicationException, ODataLibraryException {
		// TODO Auto-generated method stub

	}

	@Override
	public void deleteEntity(ODataRequest arg0, ODataResponse arg1, UriInfo arg2)
			throws ODataApplicationException, ODataLibraryException {
		// TODO Auto-generated method stub

	}

	@Override
	public void readEntity(ODataRequest request, ODataResponse response, UriInfo uriInfo, ContentType responseFormat)
			throws ODataApplicationException, SerializerException {

		// 1. retrieve the Entity Type
		List<UriResource> resourcePaths = uriInfo.getUriResourceParts();
		// Note: only in our example we can assume that the first segment is the
		// EntitySet
		UriResourceEntitySet uriResourceEntitySet = (UriResourceEntitySet) resourcePaths.get(0);
		EdmEntitySet edmEntitySet = uriResourceEntitySet.getEntitySet();

		// 2. retrieve the data from backend
		List<UriParameter> keyPredicates = uriResourceEntitySet.getKeyPredicates();
		Entity entity = storage.readEntityData(edmEntitySet, keyPredicates);

		// 3. serialize
		EdmEntityType entityType = edmEntitySet.getEntityType();

		ContextURL contextUrl = ContextURL.with().entitySet(edmEntitySet).build();
		// expand and select currently not supported
		EntitySerializerOptions options = EntitySerializerOptions.with().contextURL(contextUrl).build();

		ODataSerializer serializer = odata.createSerializer(responseFormat);
		SerializerResult serializerResult = serializer.entity(serviceMetadata, entityType, entity, options);
		InputStream entityStream = serializerResult.getContent();

		// 4. configure the response object
		response.setContent(entityStream);
		response.setStatusCode(HttpStatusCode.OK.getStatusCode());
		response.setHeader(HttpHeader.CONTENT_TYPE, responseFormat.toContentTypeString());
	}

	@Override
	public void updateEntity(ODataRequest arg0, ODataResponse arg1, UriInfo arg2, ContentType arg3, ContentType arg4)
			throws ODataApplicationException, ODataLibraryException {
		// TODO Auto-generated method stub

	}

}
