package model;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.olingo.commons.api.edm.EdmPrimitiveTypeKind;
import org.apache.olingo.commons.api.edm.FullQualifiedName;
import org.apache.olingo.commons.api.edm.provider.CsdlAbstractEdmProvider;
import org.apache.olingo.commons.api.edm.provider.CsdlEntityContainer;
import org.apache.olingo.commons.api.edm.provider.CsdlEntityContainerInfo;
import org.apache.olingo.commons.api.edm.provider.CsdlEntitySet;
import org.apache.olingo.commons.api.edm.provider.CsdlEntityType;
import org.apache.olingo.commons.api.edm.provider.CsdlNavigationProperty;
import org.apache.olingo.commons.api.edm.provider.CsdlNavigationPropertyBinding;
import org.apache.olingo.commons.api.edm.provider.CsdlProperty;
import org.apache.olingo.commons.api.edm.provider.CsdlPropertyRef;
import org.apache.olingo.commons.api.edm.provider.CsdlSchema;
import org.apache.olingo.commons.api.ex.ODataException;
import org.smap.sdal.managers.EmailManager;
import org.smap.sdal.model.ColDesc;
import org.smap.sdal.model.TableColumn;

import smapModels.SurveyModel;
import smapModels.SurveyNavigation;
import smapModels.SurveyForm;
import smapModels.PortalModel;
import smapModels.ReportModel;
import util.Util;

public class OdataReportProvider extends CsdlAbstractEdmProvider {

	String container_name;
	FullQualifiedName container; 		
	ReportModel model;
	String namespace;
	
	private static Logger log =
			Logger.getLogger(EmailManager.class.getName());

	public OdataReportProvider(ReportModel model, String namespace, String container_name) {
		this.model = model;
		this.namespace = namespace;	
		this.container_name = container_name;
		this.container = new FullQualifiedName(namespace, container_name);
	}

	@Override
	public CsdlEntityContainer getEntityContainer() throws ODataException {

		// create EntitySets
		List<CsdlEntitySet> entitySets = new ArrayList<CsdlEntitySet>();
		entitySets.add(getEntitySet(container, model.actionIdent));

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
			
			CsdlEntitySet entitySet = new CsdlEntitySet();
			entitySet.setName(entitySetName);
			String et_name = Util.convertFormToEntityName(entitySetName);
			FullQualifiedName et_fqn = new FullQualifiedName(namespace, et_name);
			entitySet.setType(et_fqn);

	
			return entitySet;
		}

		return null;
	}

	@Override
	public CsdlEntityType getEntityType(FullQualifiedName entityTypeName) throws ODataException {
		// this method is called for one of the EntityTypes that are configured in the
		// Schema
		
		CsdlEntityType entityType = null;
		
		if(entityTypeName.toString().equals("OData.Smap.visits")) {
			System.out.println("THis is it");
		}
		try {
			
			/*
			 * Get the column properties
			 */
			ArrayList<CsdlProperty> props = new ArrayList<> ();
			for(ColDesc tc : model.sqlDesc.colNames) {
					
				System.out.println("Prop: " + tc.humanName + " : " + tc.qType + " : " + tc.question_name);
					
				// Defaults
				String name = tc.name;
				String csdlType = null;
						
				if(name.equals("prikey")) {
					name = "ID";
					csdlType = EdmPrimitiveTypeKind.Int32.getFullQualifiedName().toString();
				} else {
					csdlType = Util.getCsdlType(tc.qType);
				}
								
				props.add(new CsdlProperty().setName(name).setType(csdlType));
				
			}
				
			/*
			 * Get the navigation properties
			 */			
			List<CsdlNavigationProperty> navPropList = new ArrayList<CsdlNavigationProperty>();
			
			
			// create CsdlPropertyRef for Key element
			CsdlPropertyRef propertyRef = new CsdlPropertyRef();
			propertyRef.setName("ID");

			// configure EntityType
			entityType = new CsdlEntityType();
			entityType.setName(Util.convertFormToEntityName(model.actionIdent));
			entityType.setProperties(props);
			entityType.setKey(Collections.singletonList(propertyRef));
			if(navPropList.size() > 0) {
				entityType.setNavigationProperties(navPropList);
			}
				
		} catch (Exception e) {
			log.log(Level.SEVERE, e.getMessage(), e);
			throw e;
		}

		return entityType;
	}

	@Override
	public List<CsdlSchema> getSchemas() throws ODataException {
		
		List<CsdlSchema> schemas = new ArrayList<CsdlSchema>();
		
		try {
			// create Schema		
			CsdlSchema schema = new CsdlSchema();
			schema.setNamespace(namespace);
	
			// add EntityTypes
			List<CsdlEntityType> entityTypes = new ArrayList<CsdlEntityType>();
			FullQualifiedName fqn = new FullQualifiedName(namespace, Util.convertFormToEntityName(model.actionIdent));
			entityTypes.add(getEntityType(fqn));
			
			schema.setEntityTypes(entityTypes);
	
			// add EntityContainer
			schema.setEntityContainer(getEntityContainer());
	
			// finally
			schemas.add(schema);
		} catch(ODataException e) {
			log.log(Level.SEVERE, e.getMessage(), e);
			throw e;
		}

		return schemas;
	}

}
