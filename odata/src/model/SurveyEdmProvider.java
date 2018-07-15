package model;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.apache.olingo.commons.api.edm.EdmPrimitiveTypeKind;
import org.apache.olingo.commons.api.edm.FullQualifiedName;
import org.apache.olingo.commons.api.edm.provider.CsdlAbstractEdmProvider;
import org.apache.olingo.commons.api.edm.provider.CsdlEntityContainer;
import org.apache.olingo.commons.api.edm.provider.CsdlEntityContainerInfo;
import org.apache.olingo.commons.api.edm.provider.CsdlEntitySet;
import org.apache.olingo.commons.api.edm.provider.CsdlEntityType;
import org.apache.olingo.commons.api.edm.provider.CsdlProperty;
import org.apache.olingo.commons.api.edm.provider.CsdlPropertyRef;
import org.apache.olingo.commons.api.edm.provider.CsdlSchema;
import org.apache.olingo.commons.api.ex.ODataException;
import org.smap.sdal.model.TableColumn;

import smapModels.SurveyForm;
import smapModels.SurveyModel;
import util.Util;

public class SurveyEdmProvider extends CsdlAbstractEdmProvider {
	// Service Namespace
	//public static final String NAMESPACE = "OData.Smap";

	// EDM Container
	//public static final String CONTAINER_NAME = "Container";
	//public static final FullQualifiedName CONTAINER = new FullQualifiedName(NAMESPACE, CONTAINER_NAME);

	// Entity Types Names
	//public static final String ET_PRODUCT_NAME = "Product";
	//public static final FullQualifiedName ET_PRODUCT_FQN = new FullQualifiedName(NAMESPACE, ET_PRODUCT_NAME);

	// Entity Set Names
	//public static final String ES_PRODUCTS_NAME = "Products";

	String container_name;
	FullQualifiedName container; 		
	SurveyModel model;
	String namespace;

	public SurveyEdmProvider(SurveyModel model, String namespace) {
		this.model = model;
		this.namespace = namespace;		
		container_name = model.surveyName;
		container = new FullQualifiedName(namespace, container_name);
	}

	@Override
	public CsdlEntityContainer getEntityContainer() throws ODataException {

		// create EntitySets
		List<CsdlEntitySet> entitySets = new ArrayList<CsdlEntitySet>();
		for (String name : model.forms.keySet()) {
			entitySets.add(getEntitySet(container, name));
		}

		// create EntityContainer
		CsdlEntityContainer entityContainer = new CsdlEntityContainer();
		entityContainer.setName(container_name);
		entityContainer.setEntitySets(entitySets);

		return entityContainer;
	}

	@Override
	public CsdlEntityContainerInfo getEntityContainerInfo(FullQualifiedName entityContainerName) throws ODataException {
		// This method is invoked when displaying the Service Document at e.g.
		// http://localhost:8080/DemoService/DemoService.svc
		if (entityContainerName == null || entityContainerName.equals(container)) {
			CsdlEntityContainerInfo entityContainerInfo = new CsdlEntityContainerInfo();
			entityContainerInfo.setContainerName(container);
			return entityContainerInfo;
		}

		return null;
	}

	@Override
	public CsdlEntitySet getEntitySet(FullQualifiedName entityContainer, String entitySetName) throws ODataException {
		if (entityContainer.equals(container)) {
			SurveyForm f = model.forms.get(entitySetName);
			if (f != null) {
				CsdlEntitySet entitySet = new CsdlEntitySet();
				entitySet.setName(entitySetName);
				String et_name = Util.convertFormToEntityName(entitySetName);
				FullQualifiedName et_fqn = new FullQualifiedName(namespace, et_name);
				entitySet.setType(et_fqn);

				return entitySet;
			}
		}

		return null;
	}

	@Override
	public CsdlEntityType getEntityType(FullQualifiedName entityTypeName) throws ODataException {
		// this method is called for one of the EntityTypes that are configured in the
		// Schema
		
		SurveyForm f = model.fqnForms.get(entityTypeName);
		if (f != null) {

			ArrayList<CsdlProperty> props = new ArrayList<> ();
			for(TableColumn tc : f.columns) {
				props.add(new CsdlProperty().setName(tc.name)
						.setType(EdmPrimitiveTypeKind.String.getFullQualifiedName()));
			}
			// create EntityType properties
			/*
			CsdlProperty id = new CsdlProperty().setName("ID")
					.setType(EdmPrimitiveTypeKind.Int32.getFullQualifiedName());
			CsdlProperty name = new CsdlProperty().setName("Name")
					.setType(EdmPrimitiveTypeKind.String.getFullQualifiedName());
			CsdlProperty description = new CsdlProperty().setName("Description")
					.setType(EdmPrimitiveTypeKind.String.getFullQualifiedName());
					*/

			// create CsdlPropertyRef for Key element
			CsdlPropertyRef propertyRef = new CsdlPropertyRef();
			propertyRef.setName("ID");

			// configure EntityType
			CsdlEntityType entityType = new CsdlEntityType();
			entityType.setName(Util.convertFormToEntityName(f.name));
			entityType.setProperties(props);
			entityType.setKey(Collections.singletonList(propertyRef));

			return entityType;
		}

		return null;
	}

	@Override
	public List<CsdlSchema> getSchemas() throws ODataException {
		// create Schema
		CsdlSchema schema = new CsdlSchema();
		schema.setNamespace(namespace);

		// add EntityTypes
		List<CsdlEntityType> entityTypes = new ArrayList<CsdlEntityType>();
		for(FullQualifiedName fqn : model.fqnForms.keySet()) {
			entityTypes.add(getEntityType(fqn));
		}
		schema.setEntityTypes(entityTypes);

		// add EntityContainer
		schema.setEntityContainer(getEntityContainer());

		// finally
		List<CsdlSchema> schemas = new ArrayList<CsdlSchema>();
		schemas.add(schema);

		return schemas;
	}

}
